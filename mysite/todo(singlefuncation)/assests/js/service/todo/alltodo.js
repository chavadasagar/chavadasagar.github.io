import { crudOperation } from "../../modules/crud.js";
export function getAllTodo(){
    return Array.from(crudOperation()).filter(val => val.tables == "todo");
}