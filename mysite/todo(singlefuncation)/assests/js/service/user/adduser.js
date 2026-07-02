import { crudOperation } from "../../modules/crud.js";
import { User } from "../../models/user.js";
import { generateUniqueNumber } from "../../modules/genratenumber.js";


export function AddUser(user)
{
    crudOperation("post",user)
}

