let statusbox = document.getElementById("statusbox");
let taskname = document.getElementById("taskname");

showallcontent();


document.getElementById("addstatusbtn").addEventListener("click", () => {
  let statusinput = document.createElement("input");
  let br = document.createElement("br");
  statusinput.className = "form-control";
  statusinput.setAttribute("placeholder", "Enter Your Status");
  statusbox.appendChild(statusinput);
  statusbox.append(br);
});

document.getElementById("cleartaskbtn").addEventListener("click",()=>{
    localStorage.clear();
    showallcontent();
});

document.getElementById("addtaskbtn").addEventListener("click", () => {
  let task = {
    id: new Date().getTime(),
    name: taskname.value,
    TaskStatus: Array.from(statusbox.children)
      .filter((x) => x.tagName == "INPUT")
      .map((x) => x.value),
  };

  crudOperation("post", task);

  statusbox.innerHTML = "";


  document.getElementById("taskform").reset();


  showallcontent();
});

function showallcontent() {
  let taskcontent = document.getElementById("taskcontent");

  taskcontent.innerHTML = "";

  let taskdata = Array.from(crudOperation());

  let table = document.createElement("table");

  table.className = "table table-primary";

  table.border = 1;
debugger
  taskdata.forEach((val, index, arr) => {
    // row
    let tr = document.createElement("tr");

    // tasknametd
    let tdindex = document.createElement("td");
    tdindex.textContent = index;
    tr.append(tdindex);


    let tdtaskname = document.createElement("td");
    tdtaskname.textContent = val.name;
    tr.append(tdtaskname);

    let tdqueue = document.createElement("td");
    tdqueue.append(Array.from(val.TaskStatus).join(" == >"));

    tr.append(tdqueue);

    table.append(tr);
  });

  taskcontent.append(table);
}

function crudOperation(operation = "get", data) {
  switch (operation) {
    case "post":
      // Get the existing data from local storage
      var obj = JSON.parse(localStorage.getItem("obj")) || [];
      // Add the new todo to the array
      obj.push(data);
      // Save the updated array back to local storage
      localStorage.setItem("obj", JSON.stringify(obj));
      break;
    case "get":
      // Get the data from local storage
      var obj = JSON.parse(localStorage.getItem("obj")) || [];
      // Return the data
      return obj;
      break;
    case "put":
      // Get the existing data from local storage
      var obj = JSON.parse(localStorage.getItem("obj")) || [];
      // Find the index of the todo to update
      index = obj.findIndex((todo) => todo.id === data.id);
      // Update the todo at the specified index
      obj[index] = data;
      // Save the updated array back to local storage
      localStorage.setItem("obj", JSON.stringify(obj));
      break;
    case "delete":
      debugger;
      // Get the existing data from local storage
      var obj = JSON.parse(localStorage.getItem("obj")) || [];
      // Filter out the todo to delete
      obj = obj.filter((todo) => todo.id != data.id);
      // Save the updated array back to local storage
      localStorage.setItem("obj", JSON.stringify(obj));
      break;
    default:
      console.error("Invalid operation");
  }
}
