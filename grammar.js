// Construct a regular language excluding whole reserved names without lookahead.
function identifierExcept(words) {
  const first = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
  const rest = first + '0123456789';
  function branch(prefix, candidates) {
    const next = [...new Set(candidates.map(word => word[prefix.length]).filter(Boolean))];
    const alternatives = [];
    if (prefix && !candidates.includes(prefix)) alternatives.push('');
    const other = [...(prefix ? rest : first)].filter(char => !next.includes(char)).join('');
    if (other) alternatives.push(`[${other}][${rest}]*`);
    for (const char of next) {
      alternatives.push(char + branch(prefix + char,
        candidates.filter(word => word.startsWith(prefix + char))));
    }
    return `(${alternatives.join('|')})`;
  }
  return branch('', words);
}
const RESERVED_WORDS = [
  'import', 'pub', 'repr', 'C', 'struct', 'enum', 'unsafe', 'extern', 'type', 'Copy', 'const',
  'where', 'requires', 'effects', 'read', 'write', 'allocate', 'release', 'io', 'volatile',
  'sync', 'any_memory', 'range', 'reachable', 'fresh', 'for', 'fn', 'move', 'auto', 'if',
  'else', 'while', 'in', 'match', 'pair', 'AllocFailure', 'return', 'break', 'continue',
  'mut', 'bool', 'u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64', 'usize', 'isize',
  'void', 'never', 'array', 'ref', 'ref_mut', 'slice', 'slice_mut', 'allocator', 'box',
  'buffer', 'option', 'result', 'raw', 'raw_mut', 'AllocError', 'c_int', 'c_size_t', 'none',
  'some', 'ok', 'err', 'invalid_layout', 'exhausted', 'replace', 'swap', 'drop', 'get',
  'get_mut', 'subslice', 'subslice_mut', 'split_mut', 'as_slice', 'as_slice_mut',
  'checked_add', 'checked_sub', 'checked_mul', 'checked_div', 'checked_rem', 'checked_shl',
  'checked_shr', 'try_cast', 'box_new', 'buffer_fill', 'terminate', 'true', 'false',
];

const commaSep1 = rule => seq(rule, repeat(seq(',', rule)), optional(','));
const commaSep = rule => optional(commaSep1(rule));


const OPERATORS = [
  ['logical_or', ['||']], ['logical_and', ['&&']], ['bit_or', ['|']],
  ['bit_xor', ['^']], ['bit_and', ['&']], ['equality', ['==', '!=']],
  ['relation', ['<', '<=', '>', '>=']], ['shift', ['<<', '>>']],
  ['sum', ['+', '-']], ['product', ['*', '/', '%']],
];
const INTEGER_TYPES = ['u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64', 'usize', 'isize'];

// The expression contexts share precedence, while generic delimiters and contracts restrict syntax.
function expressionRules(prefix) {
  const constant = prefix === 'constant_';
  const contract = prefix === 'contract_';
  const hidden = name => '_' + prefix + name;
  const visible = name => prefix + name + '_expression';
  const rules = {};
  for (let index = 0; index < OPERATORS.length; index++) {
    const [name, allOperators] = OPERATORS[index];
    const operators = allOperators.filter(op => !constant || !['<', '>', '>>'].includes(op));
    const lower = index + 1 < OPERATORS.length ? OPERATORS[index + 1][0] : 'unary';
    const left = ['equality', 'relation'].includes(name) ? lower : name;
    rules[hidden(name)] = $ => choice($[hidden(lower)], alias($[visible(name)], $.binary_expression));
    rules[visible(name)] = $ => prec.left(index + 1, seq(field('left', $[hidden(left)]),
      field('operator', operators.length === 1
        ? (operators[0] === '&' ? alias($._ampersand, '&') : operators[0])
        : choice(...operators)),
      field('right', $[hidden(lower)])));
  }
  rules[hidden('expression')] = $ => $[hidden('logical_or')];
  rules[hidden('unary')] = $ => choice($[hidden('postfix')], alias($[visible('unary')], $.unary_expression));
  rules[visible('unary')] = $ => prec(11, seq(choice('!', '~', '-', '*',
    ...(!contract ? ['move', seq(alias($._ampersand, '&'), optional('mut'))] : [])), $[hidden('unary')]));
  rules[hidden('postfix')] = $ => choice($[hidden('primary')],
    alias($[visible('call')], $.call_expression), alias($[visible('member')], $.member_expression),
    alias($[visible('index')], $.index_expression), ...(!contract ? [$.generic_call_expression] : []));
  rules[hidden('primary')] = $ => choice($._name, $.integer_literal, $.boolean_literal,
    alias($[visible('parenthesized')], $.parenthesized_expression),
    ...(!contract ? [$.array_expression, $.construct_expression] : []));
  rules[visible('parenthesized')] = $ => seq('(', contract ? $._contract_expression : $._expression, ')');
  rules[visible('call')] = $ => prec.left(12, seq(
    field('function', contract ? choice(...INTEGER_TYPES) : $[hidden('postfix')]),
    '(', commaSep(field('argument', contract ? $._contract_expression : $._expression)), ')'));
  rules[visible('member')] = $ => prec.left(12, seq(field('object', $[hidden('postfix')]), '.',
    field('member', choice($.identifier, $.builtin_variant))));
  rules[visible('index')] = $ => prec.left(12, seq(field('object', $[hidden('postfix')]), '[',
    field('index', contract ? $._contract_expression : $._expression), ']'));
  return rules;
}

module.exports = grammar({
  name: 'mc',
  word: $ => $.identifier,
  reserved: { global: _ => RESERVED_WORDS },
  externals: $ => [$._ampersand],
  extras: $ => [/[ \t\r\n\v\f]/, $.comment],
  conflicts: $ => [
    ...OPERATORS.map(([name]) => [$._binary_value, $['_' + name]]),
    [$._projection_value, $._postfix],
    [$._projection_value, $._primary],
    [$.type, $._plain_type], [$.place_dereference, $.unary_expression],
    [$._place, $._name], [$._plain_type, $._name],
  ],
  rules: {
    source_file: $ => repeat(choice($.import_declaration, $.struct_declaration,
      $.enum_declaration, $.function_declaration)),
    import_declaration: $ => seq('import', $.identifier, repeat(seq('::', $.identifier)), ';'),
    struct_declaration: $ => seq(optional('pub'), optional(seq('repr', '(', 'C', ')')),
      'struct', field('name', $.identifier), optional($.generic_parameters),
      optional($.where_clause), '{', repeat($.field_declaration), '}', ';'),
    field_declaration: $ => seq(optional('pub'), $.type, field('name', $.identifier), ';'),
    enum_declaration: $ => seq(optional('pub'), 'enum', field('name', $.identifier),
      optional($.generic_parameters), optional($.where_clause), '{', commaSep1($.variant), '}', ';'),
    variant: $ => seq(optional('pub'), field('name', $.identifier), optional(seq('(', commaSep1($.type), ')'))),
    function_declaration: $ => seq(optional('pub'), optional($.callable_qualifiers),
      field('return_type', choice($.type, seq('(', $.type, ')'))),
      field('name', $.identifier), optional($.generic_parameters),
      $.parameter_list, optional($.where_clause),
      optional($.requires_clause), optional($.effects_clause), choice(field('body', $.block), ';')),
    callable_qualifiers: _ => choice('unsafe', seq('extern', '"C"', 'unsafe')),
    generic_parameters: $ => seq('<', commaSep1($.generic_parameter), '>'),
    generic_parameter: $ => choice($.lifetime, seq('type', field('name', $.identifier), optional(seq(':', 'Copy'))),
      seq('const', $.type, field('name', $.identifier))),
    parameter_list: $ => seq('(', commaSep($.parameter), ')'),
    parameter: $ => seq($.type, field('name', $.identifier)),
    where_clause: $ => seq('where', '(', commaSep1($.outlives_bound), ')'),
    outlives_bound: $ => seq(choice($.lifetime, $.identifier), ':', $.lifetime),
    requires_clause: $ => seq('requires', '(', $._contract_expression, ')'),
    effects_clause: $ => seq('effects', '{', repeat(seq($.effect, ';')), '}'),
    effect: $ => choice(seq(choice('read', 'write'), '(', $.footprint, ')'),
      seq(choice('allocate', 'release', 'io', 'volatile', 'sync'), '(', field('resource', $.identifier), ')')),
    footprint: $ => choice($.footprint_path, 'any_memory',
      seq('range', '(', $.footprint_path, ',', $._contract_expression, ',', $._contract_expression, optional(','), ')'),
      seq('reachable', '(', $.footprint_path, ')'), seq('fresh', '(', field('resource', $.identifier), ')')),
    footprint_path: $ => seq(repeat('*'), choice(field('root', $.identifier), seq('(', $.footprint_path, ')')),
      repeat(choice(seq('.', field('member', $.identifier)), seq('[', field('index', $._contract_expression), ']')))),
    type: $ => choice($._plain_type, seq($.callable_qualifiers, $.function_type)),
    _plain_type: $ => choice(seq(choice($.identifier, $.builtin_type), optional($.type_arguments)),
      $.function_type, seq('for', $.lifetime_parameters, $.type)),
    lifetime_parameters: $ => seq('<', commaSep1($.lifetime), '>'),
    function_type_parameters: $ => seq('(', commaSep($.type), ')'),
    function_type: $ => seq('fn', $.function_type_parameters, '->', $.type),
    type_arguments: $ => seq('<', commaSep1(choice($.type, $.lifetime, $._constant_argument)), '>'),
    _constant_argument: $ => $._constant_expression,
    block: $ => seq('{', repeat($._statement), '}'),
    _statement: $ => choice($.block, $.declaration, $.assignment_statement, $.expression_statement,
      $.if_statement, $.while_statement, $.for_statement, $.match_statement,
      $.return_statement, $.break_statement, $.continue_statement, $.unsafe_block),
    declaration: $ => seq(optional('const'), choice($.type, 'auto'),
      field('name', $.identifier), '=', field('value', $._expression), ';'),
    assignment_statement: $ => seq(field('left', $._place), '=', field('right', $._expression), ';'),
    _place: $ => choice($.identifier, $.place_member, $.place_index, $.place_dereference,
      seq('(', $._place, ')')),
    place_member: $ => prec.left(12, seq(field('object', choice($._place, $._projection_value)), '.',
      field('member', choice($.identifier, $.builtin_variant)))),
    place_index: $ => prec.left(12, seq(field('object', choice($._place, $._projection_value)), '[', field('index', $._expression), ']')),
    _projection_value: $ => choice($.call_expression, $.generic_call_expression,
      $.array_expression, $.construct_expression, $.integer_literal, $.boolean_literal,
      seq('(', choice($._projection_value, $._binary_value), ')')),
    _binary_value: $ => choice(...OPERATORS.map(([name]) =>
      alias($[name + '_expression'], $.binary_expression))),
    place_dereference: $ => prec(11, seq('*', $._unary)),
    expression_statement: $ => seq($._expression, ';'),
    if_statement: $ => seq('if', $.condition_clause, $.block, optional(seq('else', $.block))),
    while_statement: $ => seq('while', $.condition_clause, $.block),
    condition_clause: $ => seq('(', $._expression, ')'),
    for_clause: $ => seq('(', $.type, field('name', $.identifier), 'in', field('start', $._expression),
      '..', field('end', $._expression), ')'),
    for_statement: $ => seq('for', $.for_clause, $.block),
    match_statement: $ => seq('match', $.condition_clause, '{', repeat($.match_arm), '}'),
    match_arm: $ => seq($.pattern, '=>', $.block),
    pattern: $ => choice(seq(field('constructor', choice($.identifier, $.builtin_variant)),
      optional(seq('(', commaSep1(field('binding', $.identifier)), ')'))),
      seq(field('constructor', choice($.identifier, 'pair', 'AllocFailure')), '{', commaSep($.field_binding), '}')),
    field_binding: $ => seq('.', field('name', $.identifier), '=', field('binding', $.identifier)),
    return_statement: $ => seq('return', optional($._expression), ';'),
    break_statement: _ => seq('break', ';'),
    continue_statement: _ => seq('continue', ';'),
    unsafe_block: $ => seq('unsafe', $.block),
    ...expressionRules(''),
    ...expressionRules('constant_'),
    ...expressionRules('contract_'),
    _name: $ => choice($.identifier, $.builtin_type, $.builtin_variant, $.builtin_function),
    generic_call_expression: $ => prec.left(12, seq(field('function', $._name), '::', $.type_arguments,
      '(', commaSep(field('argument', $._expression)), ')')),
    array_expression: $ => seq('[', choice(commaSep($._expression), seq($._expression, ';', $._expression)), ']'),
    construct_expression: $ => seq(field('constructor', $._name), '{', commaSep($.field_initializer), '}'),
    field_initializer: $ => seq('.', field('name', $.identifier), '=', field('value', $._expression)),
    builtin_type: _ => choice('bool', 'u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64',
      'usize', 'isize', 'void', 'never', 'array', 'ref', 'ref_mut', 'slice', 'slice_mut',
      'allocator', 'box', 'buffer', 'option', 'result', 'pair', 'raw', 'raw_mut',
      'AllocFailure', 'AllocError', 'c_int', 'c_size_t'),
    builtin_variant: _ => choice('none', 'some', 'ok', 'err', 'invalid_layout', 'exhausted'),
    builtin_function: _ => choice('replace', 'swap', 'drop', 'get', 'get_mut', 'subslice', 'subslice_mut',
      'split_mut', 'as_slice', 'as_slice_mut', 'checked_add', 'checked_sub', 'checked_mul',
      'checked_div', 'checked_rem', 'checked_shl', 'checked_shr', 'try_cast', 'box_new',
      'buffer_fill', 'terminate'),
    boolean_literal: _ => choice('true', 'false'),
    integer_literal: _ => token(seq(choice(/[0-9]+/, /0x[0-9a-fA-F]+/, /0b[01]+/),
      optional(choice('u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64', 'usize', 'isize')))),
    lifetime: _ => new RegExp("'" + identifierExcept(RESERVED_WORDS)),
    identifier: _ => new RegExp(identifierExcept(['static'])),
    comment: _ => token(choice(seq('//', /[^\r\n]*/), seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'))),
  },
});
