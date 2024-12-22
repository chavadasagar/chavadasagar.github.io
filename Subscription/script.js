document.getElementById("createPlanForm")?.addEventListener("submit", function (data) {
    CreatePlan(FormObjectToJSObject(data.currentTarget));
});

document.getElementById("createFeatureForm")?.addEventListener("submit", function (data) {
    CreateFeature(FormObjectToJSObject(data.currentTarget));
});

document.getElementById("assignFeatureForm")?.addEventListener("submit", function (data) {
    debugger

    let mappedResult = MapToAssignFeatures(data.currentTarget, FormObjectToJSObject(data.currentTarget));

    mappedResult.forEach(current => AssignFeatureToPlan(current));
});




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