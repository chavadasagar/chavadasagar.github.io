

var modal = function () {

    var self = this;
    var uid = 1;
    self.users = ko.observableArray([
        { id: uid, name: 'Bert', email: 'bert@gmail.com', gender: "male", dob: "2002-08-05", city: "junagadh", address: '302 one aprt,36458', phone: '4512789632' },
    ]);




    // this.users = ko.observableArray({ name: "nnn", emai: "sa@sa.sa", city: 'jnd', address: "sasa", phoneno: "438493" });




    this.id = ko.observable("");
    this.name = ko.observable("");
    this.email = ko.observable("");
    this.city = ko.observableArray(['junagadh', 'bhavanagar', 'rajkot', 'jamnagar', 'ahmdabad']);
    this.selectedcity = ko.observableArray(['junagadh']);
    this.address = ko.observable("");
    this.phoneno = ko.observable("");
    this.selectedgender = ko.observable("");
    this.dob = ko.observable("");




    // working
    this.saveuser = function () {

        if (this.name() == "" || this.email() == "" || this.address() == "" || this.phoneno() == "") {
            debugger;
            Swal.fire({
                icon: 'error',
                title: 'All Fields Are Required ...',
                text: ''
            });
        }
        else {
            uid++;
            self.users.push({ id: uid, name: this.name(), dob: this.dob(), city: this.selectedcity(), gender: this.selectedgender(), email: this.email(), city: this.selectedcity(), address: this.address(), phone: this.phoneno() });
            $("#add_cancel_btn").trigger("click");
        }


    }

    //working
    this.remove = function (emp) {


        Swal.fire({
            title: 'Do you want to delete this record ?',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Delete',
            denyButtonText: `Don't delete`,
        }).then((result) => {
            /* Read more about isConfirmed, isDenied below */
            if (result.isConfirmed) {
                Swal.fire('delete successfuly!!!', '', 'success')
                self.users.remove(emp);
            } else if (result.isDenied) {
                Swal.fire('data is safe', '', 'info')
            }
        })



    }





    // update field
    this.up_name = ko.observable("");
    this.up_email = ko.observable("");
    this.up_address = ko.observable("");
    this.up_phno = ko.observable("");
    this.up_phno = ko.observable("");
    this.up_selectedgender = ko.observable("");
    this.up_dob = ko.observable("");
    this.up_selectedcity = ko.observableArray(["junagadh"]);

    this.edit = function (obj) {
        document.getElementById("up_id").value = obj.id;
        document.getElementById("up_email").value = obj.email;
        document.getElementById("up_name").value = obj.name;
        document.getElementById("up_address").value = obj.address;
        document.getElementById("up_phone").value = obj.phone;
        if (obj.gender == "male") {
            document.getElementById("up_male").checked = true;

        }
        if (obj.gender == "female") {
            document.getElementById("up_female").checked = true;
        }
        debugger;
        document.getElementById("up_dob").value = obj.dob;
        

    }

    this.updateuser = function () {
        var all = self.users();



        for (var row in self.users()) {
            if (all[row].id == Number(document.getElementById("up_id").value)) {

                var temp = { id: Number(document.getElementById("up_id").value), city:this.up_selectedcity(),gender:this.up_selectedgender(),dob:this.up_dob(),name: String(document.getElementById("up_name").value), email: String(document.getElementById("up_email").value), address: String(document.getElementById("up_address").value), phone: String(document.getElementById("up_phone").value) };
                self.users.remove(all[row]);
                self.users.push(temp);
                Swal.fire(
                    'Update succcessfuly!!!',
                    '',
                    'success'
                )

                // self.users()[row].address = String(document.getElementById("up_address").value);
                // self.users()[row].phone = String(document.getElementById("up_phone").value);
                // self.users()[row].name = String(document.getElementById("up_name").value);
                // self.users()[row].email = String(document.getElementById("up_email").value);


            }
        }



        localStorage.setItem("db", self.users());

        $(".close").trigger("click");

        debugger;
    }



}





