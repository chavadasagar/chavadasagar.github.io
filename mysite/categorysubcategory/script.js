// function addCategoryInput(event) {
//   if (event.code === "Enter") {
//     
//     CreateCategory(event.currentTarget.value);
//     document.querySelector(
//       ".current_input_li"
//     ).innerHTML = `<li>${event.currentTarget.value}</li>`;

//     let li = document.createElement("li");
//     li.className = "current_input_li";
//     let input = document.createElement("input");
//     input.className = "category_input";
//     input.setAttribute("onkeydown", "addCategoryInput(event)");
//     li.append(input);

//     document.querySelector(".current_input_li").append(li);
//     document.querySelectorAll(".current_input_li")[0].removeAttribute("class");
//   }
//   if (event.code === "Tab") {
//     
//     CreateCategory(event.currentTarget.value);
//     document.querySelector(
//       ".current_input_li"
//     ).innerHTML = `<li>${event.currentTarget.value}</li>`;

//     let ul = document.createElement("ul");
//     let li = document.createElement("li");
//     li.className = "current_input_li";
//     let input = document.createElement("input");
//     input.className = "category_input";
//     input.setAttribute("onkeydown", "addCategoryInput(event)");
//     li.append(input);
//     ul.append(li);

//     document.querySelector(".current_input_li").append(ul);
//     document.querySelectorAll(".current_input_li")[0].removeAttribute("class");
//   }
// }

function FocusLiveInput() {
  document.querySelector(".live_input").focus();
}

function alphanumeric_unique() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]/g, "") // Remove numeric characters
    .split("")
    .filter(function (value, index, self) {
      return self.indexOf(value) === index;
    })
    .join("");
}

function CreateLiElementWithInput() {
  document.querySelector(".live").removeAttribute("class");

  let li = document.createElement("li");
  li.className = "live";

  let input = document.createElement("input");
  input.className = "live_input";
  input.setAttribute("onkeydown", "CreateCategoryNode(event)");
  li.append(input);

  return li;
}

function CreateUlElementWithInput() {
  document.querySelector(".live").removeAttribute("class");
  document.querySelector(".current_ul").removeAttribute("class");

  let ulclassname = alphanumeric_unique();
  let ul = document.createElement("ul");
  ul.className = "current_ul";

  let li = document.createElement("li");
  li.className = "live";

  let input = document.createElement( "input");
  input.className = "live_input";
  input.setAttribute("onkeydown", `CreateCategoryNode(event,"${ulclassname}")`);
  li.append(input);

  ul.append(li);

  return ul;
}

function PointInputParentElement() {
  document
    .querySelector(".current_ul")
    .parentElement.append(CreateLiElementWithInput());
  document.querySelector(".current_ul").parentElement.className = "current_ul";
  document.querySelectorAll(".current_ul")[1].removeAttribute("class");
  FocusLiveInput();
}

function CreateCategoryNode(event, className) {
  let category_value = event.currentTarget.value;
  if (event.code === "Enter") {
    
    document.querySelector(".live").innerText = category_value;

    document.querySelector(".current_ul").append(CreateLiElementWithInput());

    FocusLiveInput();
  }

  if (event.code === "Enter" && event.shiftKey) {
    
    document.querySelector(".live").innerText = category_value;

    document.querySelector(".current_ul").append(CreateUlElementWithInput());

    FocusLiveInput();
  }

  if (event.code === "ArrowLeft" && event.altKey) {
    document.querySelector(".live").innerText = category_value;
    PointInputParentElement();
  }
}

function CreateCategory(category_name) {
  let categorys = Array.from(GetCategorys());

  let category_id = crypto.randomUUID();

  categorys.push({
    id: category_id,
    name: category_name,
    parentId: null,
  });

  localStorage.setItem("categorys", JSON.stringify(categorys));

  return category_id;
}

function GetCategorys() {
  return JSON.parse(localStorage.getItem("categorys") ?? "[]");
}
