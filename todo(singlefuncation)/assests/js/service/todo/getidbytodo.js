import { crudOperation } from "../../modules/crud.js";

export function GetIdByTodo(id)
{
    return Array.from(crudOperation()).filter(val => val.id == id);
}