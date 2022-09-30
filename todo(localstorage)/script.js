
function addtodo()
{
    var todo = document.querySelector("#todo").value;
    if(localStorage.alltodo == undefined)
    {
        localStorage.alltodo = JSON.stringify([{id:1,name:todo,isComplate:false}]);
        Display();
    }
    else
    {
        var temparr = JSON.parse(localStorage.alltodo);
        var id = temparr.length+1;
        temparr.push({id:id,name:todo,isComplate:false});    
        localStorage.alltodo = JSON.stringify(temparr);
        Display();        
    }
}

function Display()
{
    debugger
    document.querySelector(".alltodo").innerHTML = "";
    if(localStorage.alltodo!=undefined)
    {
        if(JSON.parse(localStorage.alltodo).length != 0)
        {
            JSON.parse(localStorage.alltodo).forEach(val => {
                document.querySelector(".alltodo").innerHTML += `<a href="#" class="list-group-item list-group-item-action">${val.name} 
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
                <button class='btn btn-danger' onclick='deletetodo(${val.id})'>delete</button>&nbsp;
                <button class='btn btn-primary' onclick='showpopup(${val.id})'>Update</button></a>`;
            });
        }   
        else{
            document.querySelector(".alltodo").innerHTML = "<div class='mt-3'>Empty</div>";
        }     
    }
    else{
        document.querySelector(".alltodo").innerHTML = "<div class='mt-3'>Empty</div>";
    }
}

function clearalltodo()
{
    localStorage.removeItem("alltodo");
    Display();
}

function deletetodo(id)
{
    debugger
    var alltodo = JSON.parse(localStorage.alltodo).filter(val => {
        return val.id != id;        
    });

    localStorage.alltodo = JSON.stringify(alltodo);
    Display();
}


function showpopup(id)
{
    document.querySelector("#todoid").value = id;
    document.querySelector("#newtodoname").value = JSON.parse(localStorage.alltodo).filter(val => {
        return val.id == id;
    }).map(val => {
        return val.name;
    });

    $(".modal").modal("show");

}

function updatetodo(){
    
    // document.querySelector("#todoid").value = id;
    // document.querySelector("#newtodoname").value = JSON.parse(localStorage.alltodo).filter(val => {
    //     return val.id == id;
    // }).map(val => {
    //     return val.name;
    // });

    var id = Number(document.querySelector("#todoid").value);
    var newname = document.querySelector("#newtodoname").value;

    var updatedtodoarray = JSON.parse(localStorage.alltodo).map(val => {
        if(val.id == id)
        {
            return {id:val.id,name:newname,isComplate:val.isComplate};
        }
        return val;
    });

    localStorage.alltodo = JSON.stringify(updatedtodoarray);
    $(".modal").modal("hide");
    Display()


}



Display();
