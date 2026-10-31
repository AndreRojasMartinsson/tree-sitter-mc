[
  (block)
  (struct_declaration)
  (enum_declaration)
  (match_statement)
  (effects_clause)
  (construct_expression)
  (array_expression)
  (parenthesized_expression)
  (call_expression)
  (generic_call_expression)
  (function_type_parameters)
  (lifetime_parameters)
  (condition_clause)
  (for_clause)
  (parameter_list)
  (generic_parameters)
  (type_arguments)
  (where_clause)
  (requires_clause)
  (effect)
  (footprint)
] @indent.begin

["}" "]" ")"] @indent.branch
(generic_parameters ">" @indent.branch)
(type_arguments ">" @indent.branch)
(lifetime_parameters ">" @indent.branch)
"}" @indent.end
(comment) @indent.auto

; Continue a value on the next line, while delimiter-based captures collapse on the same row.
[
  (declaration)
  (assignment_statement)
  (return_statement)
  (expression_statement)
] @indent.begin
";" @indent.end
