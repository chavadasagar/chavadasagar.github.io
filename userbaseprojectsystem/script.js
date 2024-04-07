LoadProjects();
LoadProjectDropDown();
LoadUserDropdown();
LoadStatusDropdown();
function CreateProject(projectparam) {
  let project = FormObjectToJSObject(projectparam);

  project.sprint = [];

  crudOperation("post", project);

  projectparam.reset();

  LoadProjects();

  new bootstrap.Modal(addprojectmodel).hide();
}

document.addEventListener("OnCreateSpirnt", function (e) {
  LoadSprintsByProject(e.detail.projectid);
});

function ShowCreateSpirntWithNoSelectProjectModal(projectid) {
  new bootstrap.Modal(CreateSpirntWithNoSelectProjectModal).show();

  CreateSpirntWithNoSelectProjectForm["projectid"].value = projectid;
}

function LoadSprintsByProject(projectid) {
  let project_sprints_view_element = document.getElementById(
    "project_sprints_view"
  );

  let AddSprintBtnInSprintViewModal_element = document.getElementById(
    "AddSprintBtnInSprintViewModal"
  );

  AddSprintBtnInSprintViewModal_element.setAttribute(
    "onclick",
    `ShowCreateSpirntWithNoSelectProjectModal("${projectid}")`
  );

  project_sprints_view_element.innerHTML = "";

  new bootstrap.Modal(spirntviewmodal).show();

  let projects = crudOperation();

  let index = Array.from(projects).findIndex((x) => x.id == projectid);

  if (index != -1) {
    let sprint = Array.from(projects[index].sprint);

    sprint.forEach((x) => {
      let sprint_html = `<div class="col-md-4">
      <div class="card">
        <div class="card-header">
          <h6>Sprint Name: ${x.name}</h6>
        </div>
        <div class="card-body">
        <h6 class="card-title">Start Date: ${new Date(
          x.startdate
        ).toDateString()}</h6>
        <h6 class="card-title">Start Date: ${new Date(
          x.enddate
        ).toDateString()}</h6>
        <h6 class="card-title">Created Date: ${new Date(
          x.CreatedAt ?? new Date()
        ).toDateString()}</h6>
          <ol class="list-group list-group-numbered">
          [task_list_html_content]
          </ol>
          <br>
          <button class="btn btn-primary btn-sm" data-bs-toggle='modal' onclick='setProjectAndSprintIdInTaskForm("${
            x.id
          }","${
        projects[index].id
      }")' data-bs-target='#taskmodalbynoselectsprintandproject'>Create Task</button>
        </div>
      </div>
    </div>`;

      let task_html_content = "";

      if (x.task != undefined) {
        Array.from(x.task).forEach((task) => {
          task_html_content += `<li data-bs-toggle='modal' onclick='LoadSubtaskByTask("${
            x.id
          }","${projects[index].id}","${
            task.id
          }")' class="list-group-item d-flex justify-content-between align-items-start">
          <div class="ms-2 me-auto">
          <div class="fw-bold">${task.name} (${
            UserById(task.assined_user).fullname
          })</div>
          ${task.description}
          </div>
          <span class="badge bg-primary rounded-pill">${
            ToArray(task.subtask ?? []).length
          }</span>
          </li>`;
        });
      }

      if (x.task) {
        project_sprints_view_element.innerHTML += sprint_html.replace(
          "[task_list_html_content]",
          task_html_content
        );
      } else {
        project_sprints_view_element.innerHTML += sprint_html;
      }
    });
  }
}

function UserById(userid) {
  return (
    ToArray(crudOperation("get", undefined, "users")).find(
      (x) => x.id == userid
    ) ?? { fullname: "Test", role: "Test" }
  );
}

function LoadSubtaskByTask(sprintid, projectid, taskid) {
  new bootstrap.Modal(SubTasklistmodal).show();

  let SubTasklistmodal_element = document.getElementById("SubTasklistmodal");

  let subtasklistdata_element = document.getElementById("subtasklistdata");

  subtasklistdata_element.innerHTML = "";

  let projects = crudOperation();

  project_index = ToArray(projects).findIndex((x) => x.id == projectid);

  if (project_index != -1) {
    let project = projects[project_index];

    let sprint = ToArray(project.sprint).find((x) => x.id == sprintid);

    let task = ToArray(sprint.task).find((x) => x.id == taskid);

    console.log(task);

    ToArray(task.subtask).forEach((x) => {
      subtasklistdata_element.innerHTML += `
      <li class="list-group-item">${x.name} (${
        UserById(x.assined_user).fullname
      })</li>
      `;
    });
  }
  add_subtask_btn.setAttribute(
    "onclick",
    `ShowAddSubTaskModalWithProjectSprintTaskParams("${sprintid}","${projectid}","${taskid}")`
  );

  document
    .querySelector("#SubTasklistmodal .closebtn")
    .setAttribute("onclick", `LoadSprintsByProject("${projectid}")`);
}

function ShowAddSubTaskModalWithProjectSprintTaskParams(
  sprintid,
  projectid,
  taskid
) {
  new bootstrap.Modal(createsubtaskmodal).show();

  createsubtaskform["projectid"].value = projectid;
  createsubtaskform["sprintid"].value = sprintid;
  createsubtaskform["taskid"].value = taskid;
}

function CreateSubtask(subtaskprama) {
  debugger;
  let projects = crudOperation();

  let subtask = FormObjectToJSObject(subtaskprama);

  project_index = ToArray(projects).findIndex((x) => x.id == subtask.projectid);

  if (project_index != -1) {
    let project = projects[project_index];

    // find spirnt exists or not
    project.sprint = project.sprint ?? [];

    project.sprint.map((x) => {
      x.task = ToArray(x.task).map((x) => {
        if (x.id == subtask.taskid) {
          x.subtask = x.subtask ?? [];
          x.subtask.push(subtask);
        }
        return x;
      });

      return x;
    });

    crudOperation("put", project);

    subtaskprama.reset();

    LoadSubtaskByTask(subtask.sprintid, subtask.projectid, subtask.taskid);
  }
}

function CreateUser(userparam) {
  let user = FormObjectToJSObject(userparam);

  crudOperation("post", user, "users");

  userparam.reset();
}
function CreateStatus(statusparam) {
  let status = FormObjectToJSObject(statusparam);
  ``;
  crudOperation("post", status, "status");

  statusparam.reset();

  LoadStatusDropdown();
}

function ToArray(arr) {
  if (arr == undefined) {
    return [];
  }

  return Array.from(arr);
}
function LoadUserDropdown() {
  let users = crudOperation("get", undefined, "users");

  document.querySelectorAll(".userdropdown").forEach((element) => {
    element.innerHTML = "";

    element.innerHTML += `
    <option disabled selected>select user</option>
    `;

    ToArray(users).forEach((x) => {
      element.innerHTML += `<option value='${x.id}'>${x.fullname}</option>
      `;
    });
  });
}

function LoadStatusDropdown() {
  let users = crudOperation("get", undefined, "status");

  document.querySelectorAll(".statusdropdown").forEach((element) => {
    element.innerHTML = "";

    element.innerHTML += `
    <option disabled selected>select status</option>
    `;

    ToArray(users).forEach((x) => {
      element.innerHTML += `<option value='${x.id}'>${x.name}</option>
      `;
    });
  });
}

function setProjectAndSprintIdInTaskForm(sprintid, projectid) {
  let task_form_element = document.getElementById(
    "taskbynoselectsprintandprojectform"
  );

  task_form_element["projectid"].value = projectid;
  task_form_element["sprintid"].value = sprintid;
}

function LoadProjects() {
  let project_list_view_element = document.getElementById("project_list_view");

  project_list_view_element.innerHTML = "";

  let projects = crudOperation();

  Array.from(projects).forEach((x) => {
    project_list_view_element.innerHTML += `<div class="col-md-4">
    <div class="card bg-dark text-secondary border-white">
      <div class="card-body" onclick='LoadSprintsByProject("${x.id.toString()}")'>
        <div class="card-title">${x.name}</div>
        <p class="card-subtitle">${x.description}</p>
        <a href="" class="card-link" data-bs-target="#addsprintmodel" data-bs-toggle="modal">Add Sprint</a>
        <a href="" class="card-link">Create Task</a>
      </div>
    </div>
  </div>`;
  });
}

function CreateSprintByProject(sprintpram) {
  let sprint = FormObjectToJSObject(sprintpram);

  let projects = Array.from(crudOperation());

  let index = projects.findIndex((x) => x.id == sprint.projectid);

  if (index != -1) {
    let projectsprint = Array.from(projects[index].sprint);

    projectsprint.push(sprint);

    projects[index].sprint = projectsprint;

    crudOperation("put", projects[index]);
  }

  CreateSprintEvent(sprint);

  sprintpram.reset();
}

function CreateTaskByProjectAndSprint(taskparam) {
  debugger;

  let projects = Array.from(crudOperation());

  let task = FormObjectToJSObject(taskparam);

  let project_index = projects.findIndex((x) => x.id == task.projectid);

  if (project_index != -1) {
    let project_sprint = Array.from(projects[project_index].sprint);

    let project_sprint_index_to_create_task = project_sprint.findIndex(
      (x) => x.id == task.sprintid
    );

    if (project_sprint_index_to_create_task != -1) {
      let current_project_sprint_task =
        project_sprint[project_sprint_index_to_create_task].task ?? [];

      current_project_sprint_task.push(task);

      projects[project_index].sprint[project_sprint_index_to_create_task].task =
        current_project_sprint_task;

      crudOperation("put", projects[project_index]);
    }
  }

  taskparam.reset();

  LoadSprintsByProject(task.projectid);
}

function FormObjectToJSObject(obj) {
  var result = Object.fromEntries(new FormData(obj));
  result.id = crypto.randomUUID();
  result.CreatedAt = new Date();
  return result;
}

function SetProjectBySprintDropdown(event) {
  let sprint = document.querySelector(".sprintdropdown");

  sprint.innerHTML = `
    <option disabled selected>select sprint</option>
    `;

  Array.from(ProjectBySprints(event.currentTarget.value)).forEach((x) => {
    sprint.innerHTML += `<option value='${x.id}'>${x.name}</option>`;
  });
}

function ProjectBySprints(projectid) {
  let projects = Array.from(crudOperation());

  let index = projects.findIndex((x) => x.id == projectid);

  if (index != -1) {
    return projects[index].sprint;
  }

  return [];
}

function LoadProjectDropDown() {
  let projectdropdown = document.querySelectorAll(".projectdropdown");

  projectdropdown.forEach((dropdown) => {
    dropdown.innerHTML = `
    <option disabled selected>select project</option>
    `;

    Array.from(crudOperation()).forEach((x) => {
      dropdown.innerHTML += `<option value='${x.id}'>${x.name}</option>`;
    });
  });
}

// Custome Events

function CreateSprintEvent(sprint) {
  let event = new CustomEvent("OnCreateSpirnt", {detail:sprint});
  //dispatch event
  document.dispatchEvent(event);
}

function crudOperation(operation = "get", data, objname = "obj") {
  switch (operation) {
    case "post":
      // Get the existing data from local storage
      var obj = JSON.parse(localStorage.getItem(objname)) || [];
      // Add the new todo to the array
      obj.push(data);
      // Save the updated array back to local storage
      localStorage.setItem(objname, JSON.stringify(obj));
      break;
    case "get":
      // Get the data from local storage
      var obj = JSON.parse(localStorage.getItem(objname)) || [];
      // Return the data
      return obj;
      break;
    case "put":
      // Get the existing data from local storage
      var obj = JSON.parse(localStorage.getItem(objname)) || [];
      // Find the index of the todo to update
      index = obj.findIndex((todo) => todo.id === data.id);
      // Update the todo at the specified index
      obj[index] = data;
      // Save the updated array back to local storage
      localStorage.setItem(objname, JSON.stringify(obj));
      break;
    case "delete":
      debugger;
      // Get the existing data from local storage
      var obj = JSON.parse(localStorage.getItem(objname)) || [];
      // Filter out the todo to delete
      obj = obj.filter((todo) => todo.id != data.id);
      // Save the updated array back to local storage
      localStorage.setItem(objname, JSON.stringify(obj));
      break;
    default:
      console.error("Invalid operation");
  }
}
