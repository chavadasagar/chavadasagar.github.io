import { crudOperation } from "./modules/crud.js";
import { Todo } from "./models/todo.js";
import { generateUniqueNumber } from "./modules/genratenumber.js";
import { getAllTodo } from "./service/todo/alltodo.js";
import { DeleteTodo } from "./service/todo/deletetodo.js";


window.DeleteTodo = DeleteTodo;



function renderTodo() {
    let alltodo = document.getElementById("alltodo");
    alltodo.innerHTML = "";
    
    Array.from(getAllTodo()).forEach((val, index, arr) => {
        alltodo.innerHTML += `
        <tr>
        <td>${index + 1}</td>
        <td>${val.name}</td>
        <td>${val.isactive ? "Active" : "Inactive"}</td>
        <td><button onclick="DeleteTodo(${val.id},renderTodo())">delete</button><button onclick='alert(${JSON.stringify(JSON.stringify(val))})'>View</button></td>
        </tr>`;
    })
    
}



window.renderTodo = renderTodo;

if(document.getElementById("deletetodobtn")!=undefined)
{
    document.getElementById("deletetodobtn").addEventListener("click",function(event) {
        debugger
        let id = event.currentTarget.value;
        let todo = Todo
        todo.id = id;
    
        crudOperation("delete",todo);
        renderTodo();
    })
    
}

renderTodo();

document.getElementById("addtodobtn").addEventListener("click", function () {
    var todo = Todo
    todo.createddate = new Date();
    todo.id = generateUniqueNumber(10)
    todo.name = document.getElementById("todo").value;
    crudOperation("post", todo)
    console.log(crudOperation())
    renderTodo();    
})






