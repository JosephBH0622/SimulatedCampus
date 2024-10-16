actionLog = function (postBody) {
    let url = "http://47.88.51.173:7013/api/SimulatedCampus" + "/update/actions";
    fetch(url, postBody
    ).then((response) => {
        if (!response.ok) {
            console.error("Post to Database failed:", response.status);
        }
    }).catch((error) => {
        console.error("Database Error:", error);
    });
}

actionLog({
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        world_index: "785a1021-e917-49c8-87a3-fb648096d8af",
        world_time: 1,
        DEBUG: false,
        plan_from: "generate",
        plan_id: 1660
    }),
})