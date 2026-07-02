export const permission = {
    id:"",
    roleid:"",
    moduleid:"",
    isread:false,
    isadd:false,
    isupdate:false,
    isother:false,
    tables:"permission",
    createddate:null,
    getname(){
        return this.name;
    },
    setname(name){
        this.name = name;
    }
}