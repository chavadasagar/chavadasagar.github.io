document.getElementById("CreatePlanBtn")?.addEventListener("click", function () {
    CreatePlan(FormObjectToJSObject(createPlanForm));

    document.location.pathname = "Subscription/index.html";
});

document.getElementById("CreateFeatureBtn")?.addEventListener("click", function () {
    CreateFeature(FormObjectToJSObject(createFeatureForm));
    document.location.pathname = "Subscription/index.html";
});

document.getElementById("AssignFeaturesBtn")?.addEventListener("click", function (data) {
    debugger

    let mappedResult = MapToAssignFeatures(assignFeatureForm, FormObjectToJSObject(assignFeatureForm));

    mappedResult.forEach(current => AssignFeatureToPlan(current));

    document.location.pathname = "Subscription/index.html";
});

function loadDropdowns() {
    document.getElementById("assignPlan").innerHTML = window.GetAllPlans()
        ?.map(pln => `<option value='${pln.id}'>${pln.name}</option>`)
        ?.join("");

    document.getElementById("assignFeature").innerHTML = window.GetAllFeatures()
        ?.map(f => `<option value='${f.id}'>${f.name}</option>`)
        ?.join("");
}

function loadPlans() {
    document.getElementById("plans").innerHTML = "";
    let planHtml = `<div class="col-md-4">
      <div class="card text-center">
        <div class="card-body">
          <p class="card-text">[[name]]</p>
          <h3 class="card-title">[[price]]</h3>
          <p class="card-text text-center">per / [[duration]]</p>
          <button class="btn btn-primary">Current Plan</button>

          <br>
          <br>

          
          <ul class="list-group">
          [[features]]
        </ul
        </div>

      </div>
    </div>`;

    GetAllPlansWtihHisFeature()?.forEach(pln => {
        let featurehtml = pln.features.map(f => `<li class="list-group-item">${f.name}</li>`).join("");
        document.getElementById("plans").innerHTML += planHtml
            .replace("[[name]]", pln.name)
            .replace("[[price]]", pln.price)
            .replace("[[duration]]", pln.duration)
            .replace("[[features]]", featurehtml);
    });
}

// start mappings

function MapToAssignFeatures(formElement, featurePlansRequest) {
    let selectdFeaturesId = Array.from(formElement.featureids.selectedOptions).map(x => x.value)

    let result = selectdFeaturesId.map(id => {
        return { planId: featurePlansRequest.planid, featureId: id }
    });

    return result;
}

function FormObjectToJSObject(obj) {
    var result = Object.fromEntries(new FormData(obj));
    result.id = crypto.randomUUID();
    result.CreatedAt = new Date();
    return result;
}

// end mappings


function GetAllPlansWtihHisFeature() {
    let plans = Array.from(JSON.parse(localStorage.getItem("plans") ?? "[]"));
    let features = Array.from(JSON.parse(localStorage.getItem("features") ?? "[]"));
    let planFeatures = Array.from(JSON.parse(localStorage.getItem("planFeatures") ?? "[]"));


    return plans?.map(plan => {
        return {
            ...plan,
            features: planFeatures.filter(pf => pf.planId == plan.id).map(f => {
                return { id: f.featureId, name: features
                    .filter(x => x.id == f.featureId)[0].name
                 };
            })
        }
    });
}

function GetAllFeatures() {
    return Array.from(JSON.parse(localStorage.getItem("features") ?? "[]"));
}

function GetAllPlans() {
    return Array.from(JSON.parse(localStorage.getItem("plans") ?? "[]"));
}

function CreatePlan(plan) {
    let plans = Array.from(JSON.parse(localStorage.getItem("plans") ?? "[]"));

    plans.push(plan);

    localStorage.setItem("plans", JSON.stringify(plans));
}

function CreateFeature(feature) {
    let features = Array.from(JSON.parse(localStorage.getItem("features") ?? "[]"));

    features.push(feature);

    localStorage.setItem("features", JSON.stringify(features));
}

function AssignFeatureToPlan(planFeature) {
    let planFeatures = Array.from(JSON.parse(localStorage.getItem("planFeatures") ?? "[]"));

    planFeatures.push(planFeature);

    localStorage.setItem("planFeatures", JSON.stringify(planFeatures));
}
