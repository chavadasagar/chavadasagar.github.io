var todos = new Array();


function DeleteTodo(e)
{
    debugger;
    let ConfirmDelete = confirm("Confirm Delete This Todo ??");
    if(ConfirmDelete)
    {
        e.target.parentElement.parentElement.parentElement.remove()
    }
    else{
        alert("Your Todo Is Safe");
    }
}

function UpdateTodo(e)
{
    try
    {
        // e.target.parentElement.previousElementSibling.innerHTML = `<input class='form-control' value='${current_val}' id='ChangeValue'>`;
        let current_val = e.target.parentElement.parentElement.firstElementChild.textContent;
        let ChangedValue = prompt("Your Value =>" + current_val);
        e.target.parentElement.parentElement.firstElementChild.innerText = ChangedValue;
    }
    catch(err)
    {
        alert(err);
    }
}

function LoadAllTodo()
{
    try
    {
        document.querySelector(".all_todo").innerHTML = "";
        todos.forEach(function(val,index,arr){
            document.querySelector(".all_todo").innerHTML += `
            <div class='col-md-4 mt-3'>
            <div class='card p-2 shadow'>
              <h4>${val}</h4>
              <div class='card-footer d-flex p-3'>
                <button onclick='DeleteTodo(event)' class='btn btn-danger'>Remove</button>&nbsp;&nbsp;
                <button onclick='UpdateTodo(event)' class='btn btn-primary'>Update</button>
              </div>
            </div>
            </div>
            `;
        });
    }
    catch(err)
    {
        alert(err);
    }
}


document.getElementById("todo").addEventListener("keyup",function(event){
    if(event.key == 'Enter')
    {
        let TodoName = this.value;
        todos.push(TodoName);
        this.value = "";
        LoadAllTodo();
    }
}) ;

