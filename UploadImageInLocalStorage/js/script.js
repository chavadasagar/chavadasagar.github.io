function Upload(e) {
  let file = new FileReader();
  file.onload = () => {
    debugger;
    let fileinfo = {
      info: {
        size: document.getElementById("file").files[0].size,
        name: document.getElementById("file").files[0].name,
        type: document.getElementById("file").files[0].type,
        lastModified: document.getElementById("file").files[0].lastModified,
      },
      data: file.result,
    };

    UploadFileInLocalStorage(fileinfo);

    document.getElementById("file").value = "";
  };
  file.readAsDataURL(document.getElementById("file").files[0]);
}

function UploadFileInLocalStorage(obj) {
  let allfiles =
    localStorage.getItem("allfiles") == null
      ? []
      : JSON.parse(localStorage.getItem("allfiles"));
  obj.id = allfiles.length + 1;
  allfiles.push(obj);
  localStorage.setItem("allfiles", JSON.stringify(allfiles));
}

function GetAllFile() {
  let allfiles =
    localStorage.getItem("allfiles") == null
      ? []
      : JSON.parse(localStorage.getItem("allfiles"));
  return allfiles;
}

function RederData() {
  var htmlfilecontent = ` <div class="col-md-4 gy-2">
    <div class="card">
        <div class="card-header">
            [filename]
        </div>
        <div class="card-body">
            <div class="card-title">
                <p>Size : <span>[filesize]</span></p>
                <p>Created Date : <span>[filecreateddate]</span></p>
                <p>Type : <span>[filetype]</span></p>
                <a href="[filepath]" download="[downloadname]">download</a>&nbsp
                <button class='btn btn-primary btn-sm' data-bs-toggle='collapse' data-bs-target='#[collapsetarget]'>hide/show</button>
                <button  class='btn btn-danger btn-sm' onclick="DeleteFile([fileid])">delete</button><br><br>
                <img src="[filepath]" class='img-fluid' class='collapse' id='[collapseid]'></img>
            </div>
        </div>
    </div>
</div>`;

  var htmlallfilecontent = "";

  let allfiles = document.querySelector("#allfiles .row");

  if (Array.from(GetAllFile()).length == 0) {
    allfiles.innerHTML = "<br>Empty";
  } else {
    allfiles.innerHTML = "";
    allfiles.innerHTML += "<br>";

    Array.from(GetAllFile()).forEach((x) => {
      htmlallfilecontent += htmlfilecontent
        .replace("[filename]", x.info.name)
        .replace("[filesize]", x.info.size/1024/1024 + " MB")
        .replace("[filecreateddate]", new Date(x.info.lastModified).toDateString())
        .replace("[filetype]", x.info.type)
        .replace("[filepath]", x.data)
        .replace("[filepath]", x.data)
        .replace("[downloadname]", x.info.name)
        .replace("[fileid]", x.id)
        .replace("[collapsetarget]", "collapse" + x.id)
        .replace("[collapseid]", "collapse" + x.id);
    });

    allfiles.innerHTML = htmlallfilecontent;
  }
}

function DeleteFile(id) {
  if (confirm("are you sure ?")) {
    if (Array.from(GetAllFile().filter((x) => x.id == id) != null)) {
      localStorage.setItem(
        "allfiles",
        JSON.stringify(Array.from(GetAllFile()).filter((x) => x.id != id))
      );
      RederData();
    } else {
      alert("file not found");
    }
  } else {
    alert("your file is safe");
  }
}

function showimage() {
  debugger;
  //   document.getElementById("modalimage").src = str;
  $(".imagemodal").modal("show");
}
