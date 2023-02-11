import { crudOperation } from "../../modules/crud.js";

export function UpdateTodo(todo)
{
    crudOperation("put",todo);
}