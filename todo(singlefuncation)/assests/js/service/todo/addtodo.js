import { crudOperation } from "../../modules/crud.js";

export function AddTodo(todo)
{
    crudOperation("post",todo);
}