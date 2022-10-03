
function addtodo() {
    var todo = document.querySelector("#todo").value;
    if (localStorage.alltodo == undefined) {
        localStorage.alltodo = JSON.stringify([{ id: 1, name: todo, isComplate: false ,createdTime:new Date() }]);
        document.querySelector("#todo").value = "";
        Display();
    }
    else if (document.querySelector("#todo").value == "") {
        swal.fire("Please Enter Todo Name","","error");
    }
    else {
        var temparr = JSON.parse(localStorage.alltodo);
        var id = temparr.length + 1;
        temparr.push({ id: id, name: todo, isComplate: false });
        localStorage.alltodo = JSON.stringify(temparr);
        document.querySelector("#todo").value = "";
        Display();
    }
}

function Display() {
    document.querySelector(".alltodo").innerHTML = "";
    if (localStorage.alltodo != undefined) {
        if (JSON.parse(localStorage.alltodo).length != 0) {
            JSON.parse(localStorage.alltodo).forEach(val => {

                if (val.isComplate) {
                    document.querySelector(".alltodo").innerHTML += `<a href="#${val.id}" ondblclick='isFinish(${val.id})' class=" text-dark display-4 list-group-item list-group-item-action"><s>${val.name}</s>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
                
                <i class="fa fa-check btn-success rounded-circle" aria-hidden="true"></i>
                &nbsp;&nbsp;
                <br>
                <span style='font-size: 30px;'>${window.moment(val.createdTime).format("DD-MM-YYYY LT")}</span>
                <br>
                <button class='btn btn-danger' onclick='deletetodo(${val.id})'> <i class='fa fa-trash' onclick='deletetodo(${val.id})'></i> delete</button>&nbsp;
                <button class='btn btn-primary ' onclick='showpopup(${val.id})'> <i class='fa fa-edit' ></i> Update</button></a>
                `;
            }
            else {
                document.querySelector(".alltodo").innerHTML += `<a href="#${val.id}" ondblclick='isFinish(${val.id})' class="text-dark display-4 list-group-item list-group-item-action">${val.name} 
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
                <i class="fa fa-close rounded-circle p-2 btn-danger"></i>
                &nbsp;&nbsp;
                <br>
                <span style='font-size: 30px;'>${window.moment(val.createdTime).format("DD-MM-YYYY LT")}</span>
                <br>
                <button class='btn btn-danger' onclick='deletetodo(${val.id})'> <i class='fa fa-trash'></i> delete</button>&nbsp;
                <button class='btn btn-primary ' onclick='showpopup(${val.id})'> <i class='fa fa-edit'></i> Update</button></a>
            
                
                `;
            }
            });
        }
        else {
            document.querySelector(".alltodo").innerHTML = "<div class='mt-3'>Empty</div>";
        }
    }
    else {
        document.querySelector(".alltodo").innerHTML = "<div class='mt-3'>Empty</div>";
    }
}

function clearalltodo() {
    localStorage.removeItem("alltodo");
    Display();
}

function deletetodo(id) {
    debugger
    var alltodo = JSON.parse(localStorage.alltodo).filter(val => {
        return val.id != id;
    });

    localStorage.alltodo = JSON.stringify(alltodo);
    Display();
}


function showpopup(id) {
    document.querySelector("#todoid").value = id;
    document.querySelector("#newtodoname").value = JSON.parse(localStorage.alltodo).filter(val => {
        return val.id == id;
    }).map(val => {
        return val.name;
    });

    $(".modal").modal("show");

}

function updatetodo() {

    // document.querySelector("#todoid").value = id;
    // document.querySelector("#newtodoname").value = JSON.parse(localStorage.alltodo).filter(val => {
    //     return val.id == id;
    // }).map(val => {
    //     return val.name;
    // });

    var id = Number(document.querySelector("#todoid").value);
    var newname = document.querySelector("#newtodoname").value;

    var updatedtodoarray = JSON.parse(localStorage.alltodo).map(val => {
        if (val.id == id) {
            return { id: val.id, name: newname, isComplate: val.isComplate ,createdTime:val.createdTime};
        }
        return val;
    });

    localStorage.alltodo = JSON.stringify(updatedtodoarray);
    $(".modal").modal("hide");
    Display()

}

function isFinish(id) {
    debugger
    var alltodo = JSON.parse(localStorage.alltodo);
    var newtodo = alltodo.map(todo => {
        if (todo.id == id) {
            if (todo.isComplate) {
                return { id: todo.id, name: todo.name, isComplate: false };
            }
            else {
                return { id: todo.id, name: todo.name, isComplate: true };
            }

        }
        else {
            return todo;
        }
    });

    localStorage.alltodo = JSON.stringify(newtodo);
    Display();
}




Display();
