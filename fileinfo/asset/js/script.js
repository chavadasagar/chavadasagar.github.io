function GetMyFormatdate(date){
    let newdate = "[dd]/[mm]/[yyyy]";
    return newdate.replace("[dd]",date.getDate()).replace("[mm]",date.getMonth()).replace("[yyyy]",date.getFullYear());
}

function setfileinfo(file)
{
    let fileinfo = file.currentTarget.files[0];
    if(document.querySelector(".fileinfo").classList.contains("d-none"))
    {
        document.querySelector(".fileinfo").classList.remove("d-none");
    }
    
    debugger

    document.querySelector(".filename").innerText = fileinfo.name;
    document.querySelector(".filesize").innerText = fileinfo.size +" bytes";
    document.querySelector(".lastmodified").innerText = GetMyFormatdate(new Date(fileinfo.lastModified));
    document.querySelector(".filetype").innerText = fileinfo.type;
}