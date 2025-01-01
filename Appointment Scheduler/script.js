// storage
let providers = JSON.parse(localStorage.getItem("providers")) ?? [];
let providersSlots = JSON.parse(localStorage.getItem("providerSlots")) ?? [];

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

function SlotsByProivderAndDate(providerId, date) {
    // Find the provider object by matching providerId and date
    const provider = providersSlots.find(item => item.providerId == providerId && item.date == date);
    
    // If provider is found, return the slots, otherwise return an empty array
    return provider ? provider.slot : [];
}

function loadDropDowns(id) {
    if (document.getElementById("providerSelect"))
    {
        document.getElementById("providerSelect").innerHTML
            = Array.from(providers).map(x => `<option value='${x.id}' ${id == x.id ? 'selected' : ''}>${x.name}</option>`).join("");
    }
}

function createSlots(providerSlots) {
    providersSlots.push(MapProviderSlotsToObject(providerSlots));
    localStorage.setItem("providerSlots", JSON.stringify(providersSlots));
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

    result.providerId = FormObjectToJSObject(providerSlots).id;
    result.date = FormObjectToJSObject(providerSlots).date;

    result.slot = Array.from(startTime).map((val, i) => {
        return { startTime: val, endTime: endTime[i] };
    });

    return result;
}

function FormObjectToJSObject(obj) {
    var result = Object.fromEntries(new FormData(obj));
    result.id = crypto.randomUUID();
    result.CreatedAt = new Date();
    return result;
}
