(function_declaration) @function.outer
(function_declaration body: (block) @function.inner
  (#offset! @function.inner 0 1 0 -1))

[(struct_declaration) (enum_declaration)] @class.outer
(struct_declaration "{" . _+ @class.inner . "}")
(enum_declaration "{" . _+ @class.inner . "}")

(block) @block.outer
((block) @block.inner
  (#offset! @block.inner 0 1 0 -1))

[(while_statement) (for_statement)] @loop.outer
(while_statement (block) @loop.inner
  (#offset! @loop.inner 0 1 0 -1))
(for_statement (block) @loop.inner
  (#offset! @loop.inner 0 1 0 -1))

[(if_statement) (match_statement) (match_arm)] @conditional.outer
(if_statement (block) @conditional.inner
  (#offset! @conditional.inner 0 1 0 -1))
(match_arm (block) @conditional.inner
  (#offset! @conditional.inner 0 1 0 -1))

[(call_expression) (generic_call_expression)] @call.outer
(call_expression "(" . _+ @call.inner . ")")
(generic_call_expression "(" . _+ @call.inner . ")")

; Prefer a trailing comma; use the preceding comma for the final non-first item.
(parameter_list "(" . (parameter) @parameter.inner @parameter.outer . ","? @parameter.outer)
(parameter_list "," @parameter.outer . (parameter) @parameter.inner @parameter.outer)
(call_expression "(" . argument: (_) @parameter.inner @parameter.outer . ","? @parameter.outer)
(call_expression "," @parameter.outer . argument: (_) @parameter.inner @parameter.outer)
(generic_call_expression "(" . argument: (_) @parameter.inner @parameter.outer . ","? @parameter.outer)
(generic_call_expression "," @parameter.outer . argument: (_) @parameter.inner @parameter.outer)

(comment) @comment.outer
(return_statement) @return.outer
(return_statement (_) @return.inner)

(declaration) @assignment.outer
(declaration name: (identifier) @assignment.lhs value: (_) @assignment.rhs)
(assignment_statement) @assignment.outer
(assignment_statement left: (_) @assignment.lhs right: (_) @assignment.rhs)

(block (_) @statement.outer)
(field_declaration) @statement.outer
(variant) @statement.outer
