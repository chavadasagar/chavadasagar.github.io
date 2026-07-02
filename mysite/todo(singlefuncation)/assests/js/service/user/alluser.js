import { crudOperation } from "../../modules/crud.js";



export function getAllUser()
{
    debugger
    return Array.from(crudOperation()).filter(val => val.tables == "user");
}