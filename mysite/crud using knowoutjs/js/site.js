var employee = {

    id: ko.observable(""),
    name: ko.observable(""),
    email: ko.observable(""),
    city: ko.observableArray(['junagadh', 'bhavanagar', 'rajkot', 'jamnagar', 'ahmdabad']),
    selectedcity: ko.observableArray([]),
    address: ko.observable(""),
    phoneno: ko.observable(""),
    selectedgender: ko.observable(""),
    dob: ko.observable(""),

}


var modal = function () {



    // storing data 
    var self = this;
    var uid = 1;
    self.users = ko.observableArray([
        // { id: uid, name: 'Bert', email: 'bert@gmail.com', gender: "male", dob: "2002-08-05", city: "junagadh", address: '302 one aprt,36458', phone: '4512789632' },

    ]);
    // end storing data 

    debugger;


    // start add form variables
    this.id = ko.observable("");
    this.name = ko.observable("");
    this.email = ko.observable("");
    this.city = ko.observableArray(['junagadh', 'bhavanagar', 'rajkot', 'jamnagar', 'ahmdabad']);
    this.selectedcity = ko.observableArray(['junagadh']);
    this.address = ko.observable("");
    this.phoneno = ko.observable("");
    this.selectedgender = ko.observable("");
    this.dob = ko.observable("");
    // end add form variables


    this.add_modal_btn = function () {
        $(".add_form .form-control").val("");
        debugger;
    }

    // start save user method
    this.saveuser = function () {

        // validation part
        if (this.name() == "" || this.email() == "" || this.address() == "" || this.phoneno() == "") {
            // show error if field is blank
            $(".close").trigger("click");
            Swal.fire({
                icon: 'error',
                title: 'All Fields Are Required ...',
                text: ''
            });
        }
        else {
            // if not any error then user is save
            uid++;
            self.users.push({ id: uid, name: this.name(), dob: this.dob(), city: this.selectedcity(), gender: this.selectedgender(), email: this.email(), city: this.selectedcity(), address: this.address(), phone: this.phoneno() });
            employee.email("hello");


            //clear value box 
            this.name("");
            this.email("");
            this.selectedcity([]);
            this.dob("");
            this.address("");
            this.phoneno("");
            this.selectedgender(false);
            //end clear value box 

            $(".close").trigger("click");

            // $(".add_form").trigger("reset");
        }

    }
    // end save user

    //start remove method
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
    //end remove method





    // start update field
    this.up_name = ko.observable("");
    this.up_email = ko.observable("");
    this.up_address = ko.observable("");
    this.up_phno = ko.observable("");
    this.up_phno = ko.observable("");
    this.up_selectedgender = ko.observable("");
    this.up_dob = ko.observable("");
    this.up_selectedcity = ko.observableArray(["junagadh"]);
    this.change_up_name = ko.observable("");
    // end update field

    //start fetch specific value inside array according obj
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
        document.getElementById("up_dob").value = obj.dob;
    }
    //end fetch specific value inside array according obj

    //start update user using field value and id 
    this.updateuser = function () {
        var all = self.users();
        for (var row in self.users()) {
            if (all[row].id == Number(document.getElementById("up_id").value)) {
                var temp = { id: Number(document.getElementById("up_id").value), city: this.up_selectedcity(), gender: this.up_selectedgender(), dob: document.getElementById("up_dob").value, name: String(document.getElementById("up_name").value), email: String(document.getElementById("up_email").value), address: String(document.getElementById("up_address").value), phone: String(document.getElementById("up_phone").value) };
                self.users.remove(all[row]);
                self.users.push(temp);
                Swal.fire(
                    'Update succcessfuly!!!',
                    '',
                    'success'
                )
            }

        }
        $(".close").trigger("click");

    }
    //end update user using field value and id 



}





