import { generateUniqueNumber } from "../modules/genratenumber.js";

const Todo = {
    id:generateUniqueNumber(10),
    name:"",
    tables:"todo",
    isactive:true,
    createddate:null,
    getid(){
        return this.id;
    },
    getname(){
        return this.name;
    },
    getstatus(){
        return this.isactive;
    }
}

export {Todo}