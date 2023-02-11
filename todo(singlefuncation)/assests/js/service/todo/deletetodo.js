import { Todo } from "../../models/todo.js";
import { crudOperation } from "../../modules/crud.js";

export function DeleteTodo(id) {
    debugger
    let todo = Todo
    todo.id = String(id);
    crudOperation("delete",todo);    

    renderTodo();
}