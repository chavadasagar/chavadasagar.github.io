// storage
let providers = JSON.parse(localStorage.getItem("providers")) ?? [];
let providersSlots = JSON.parse(localStorage.getItem("providerSlots")) ?? [];
let appointments = JSON.parse(localStorage.getItem("appointments")) ?? [];

// events
let onCreateProvider = new Event("onCreateProvider");

// init
loadDropDowns();


// trigger event
document.addEventListener("onCreateProvider", function (el) {
    console.log(el);
    document.location.href = `createSlots.html?providerId=${String(el.data.id)}`;
});


if (document.location.pathname.includes("createSlots.html")) {
    debugger
    const queryParams = new URLSearchParams(document.location.search);
    loadDropDowns(queryParams.get("providerId"));
}


function createAppointment(appointment) {
    appointments.push(FormObjectToJSObject(appointment));
    JSON.setItem("appointments", JSON.stringify(appointments));
    loadAllAppointments();
}


function loadAllAppointments()
{
    
}

function showProviderSlots(provider, date) {
    debugger

    let result = Array.from(SlotsByProivderAndDate(provider.value, date.value));

    if (date.value == '') {
        alert("please select data");
        return;
    }

    if (result.length == 0) {
        alert("no slot are available");
        return;
    }

    providerSlots.innerHTML =
        result.map(val => `<option value=${val.startTime} to ${val.endTime}>${val.startTime} to ${val.endTime}</option>`).join();

}

function SlotsByProivderAndDate(providerId, date) {
    // Find the provider object by matching providerId and date
    const provider = providersSlots.find(item => item.providerId == providerId && item.date == date);

    // If provider is found, return the slots, otherwise return an empty array
    return provider ? provider.slot : [];
}

function loadDropDowns(id) {
    if (document.getElementById("providerSelect")) {
        document.getElementById("providerSelect").innerHTML = `<option value="" selected disabled>Select a Provider</option>`;

        document.getElementById("providerSelect").innerHTML
            += Array.from(providers).map(x => `<option value='${x.id}' ${id == x.id ? 'selected' : ''}>${x.name}</option>`).join("");
    }
}

function createSlots(providerSlots) {
    providersSlots.push(MapProviderSlotsToObject(providerSlots));
    localStorage.setItem("providerSlots", JSON.stringify(providersSlots));
    document.location.href = `createAppointment.html`;
}


function createProvider(form) {
    let provider = FormObjectToJSObject(form);
    providers.push(provider);
    localStorage.setItem("providers", JSON.stringify(providers));
    onCreateProvider.data = provider;
    document.dispatchEvent(onCreateProvider);
    return provider?.id;
}

function MapProviderSlotsToObject(providerSlots) {
    let result = {};
    let startTime = providerSlots.querySelectorAll("[name*=startTime]");
    let endTime = providerSlots.querySelectorAll("[name*=endTime]");

    result.id = FormObjectToJSObject(providerSlots).id;
    result.providerId = FormObjectToJSObject(providerSlots).provider;
    result.date = FormObjectToJSObject(providerSlots).date;

    result.slot = Array.from(startTime).map((val, i) => {
        return { startTime: val.value, endTime: endTime[i].value };
    });

    return result;
}

function FormObjectToJSObject(obj) {
    var result = Object.fromEntries(new FormData(obj));
    result.id = crypto.randomUUID();
    result.CreatedAt = new Date();
    return result;
}
