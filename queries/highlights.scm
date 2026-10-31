; Context rules follow the identifier fallback so properties and declarations win.
(identifier) @variable
(integer_literal) @number
(boolean_literal) @boolean
(comment) @comment
(lifetime) @attribute
(builtin_type) @type.builtin
(builtin_variant) @constant.builtin
(builtin_function) @function.builtin

(import_declaration (identifier) @module)
(struct_declaration name: (identifier) @type.definition)
(enum_declaration name: (identifier) @type.definition)
(type (identifier) @type)
(outlives_bound (identifier) @type)
(generic_parameter "type" name: (identifier) @type.definition)
(generic_parameter "const" name: (identifier) @constant)
(field_declaration name: (identifier) @variable.member)
(variant name: (identifier) @constant)
(parameter name: (identifier) @variable.parameter)
(function_declaration name: (identifier) @function)
(declaration "const" name: (identifier) @constant)

(member_expression member: (identifier) @variable.member)
(place_member member: (identifier) @variable.member)
(footprint_path member: (identifier) @variable.member)
(field_initializer name: (identifier) @variable.member)
(field_binding name: (identifier) @variable.member)

(call_expression function: (identifier) @function.call)
(generic_call_expression function: (identifier) @function.call)
(call_expression function: (member_expression member: (identifier) @function.call))
; Contract casts have anonymous scalar tokens instead of builtin_type nodes.
(call_expression function: ["u8" "u16" "u32" "u64" "i8" "i16" "i32" "i64" "usize" "isize"] @type.builtin)
(construct_expression constructor: (identifier) @constructor)
(pattern constructor: (identifier) @constructor)

; Named builtins keep their categories when used as callees or constructors.
(call_expression function: (builtin_type) @type.builtin)
(call_expression function: (builtin_variant) @constructor)
(generic_call_expression function: (builtin_variant) @constructor)
(construct_expression constructor: (builtin_type) @constructor)
(pattern constructor: (builtin_variant) @constructor)
(pattern constructor: ["pair" "AllocFailure"] @constructor)

"import" @keyword.import
["struct" "enum" "type"] @keyword.type
"fn" @keyword.function
["pub" "const" "mut" "unsafe" "extern"] @keyword.modifier
"move" @keyword.operator
["if" "else" "match"] @keyword.conditional
["while" "for" "in" "break" "continue"] @keyword.repeat
"return" @keyword.return
["where" "requires" "effects"] @keyword
"auto" @type.builtin
"Copy" @type.builtin
["repr" "C"] @attribute.builtin
"\"C\"" @string.special

(effect ["read" "write" "allocate" "release" "io" "volatile" "sync"] @function.builtin)
(footprint ["range" "reachable" "fresh"] @function.builtin)
(footprint "any_memory" @constant.builtin)

["+" "-" "*" "/" "%" "!" "~" "&" "|" "^" "&&" "||"
 "==" "!=" "<" "<=" ">" ">=" "<<" ">>" "=" ".." "->" "=>"] @operator
["(" ")" "[" "]" "{" "}"] @punctuation.bracket
[";" "," "." ":" "::"] @punctuation.delimiter
; Generic delimiters are brackets, whereas relational operators remain operators.
(generic_parameters ["<" ">"] @punctuation.bracket)
(type_arguments ["<" ">"] @punctuation.bracket)
(lifetime_parameters ["<" ">"] @punctuation.bracket)
