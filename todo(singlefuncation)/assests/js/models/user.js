export const User = {
    id:"",
    name:"",
    email:"",
    password:"",
    role:"",
    tables:"user",
    createddate:null,
    getname(){
        return this.name;
    },
    setname(name){
        this.name = name;
    }
}