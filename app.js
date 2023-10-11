const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const snakeCaseToCamelCase = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const snakeCaseToCamelCaseForDistrict = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const dbpath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("Server Running at http://localhost/3002/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        SELECT 
            *
        FROM
            state
        ORDER BY
            state_id;
    `;
  const statesArray = await db.all(getStatesQuery);
  const statesResult = statesArray.map((eachState) =>
    snakeCaseToCamelCase(eachState)
  );
  response.send(statesResult);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
        SELECT 
            *
        FROM
            state
        WHERE
            state_id = ${stateId};
    `;
  const stateArray = await db.get(getStateQuery);
  const stateResult = snakeCaseToCamelCase(stateArray);
  response.send(stateResult);
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
        INSERT INTO district
            (district_name, state_id, cases, cured, active, deaths)
        VALUES 
             ("${districtName}",
              ${stateId},
              ${cases},
              ${cured},
              ${active},
              ${deaths});
    `;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
        SELECT
            *
        FROM
            district
        WHERE
            district_id = ${districtId};
    `;
  const districtArray = await db.get(getDistrictQuery);
  const districtResult = snakeCaseToCamelCaseForDistrict(districtArray);
  response.send(districtResult);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
        DELETE
        FROM
            district
        WHERE 
            district_id = ${districtId};
    `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictsQuery = `
        UPDATE 
            district
        SET
            district_name = "${districtName}",
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE
            district_id = ${districtId};
    `;
  await db.run(updateDistrictsQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
        SELECT
            SUM(cases), SUM(cured), SUM(active), SUM(deaths)
        FROM
            district
        WHERE 
            state_id = ${stateId};
    `;
  const statsArray = await db.get(getStatsQuery);
  response.send({
    totalCases: statsArray["SUM(cases)"],
    totalCured: statsArray["SUM(cured)"],
    totalActive: statsArray["SUM(active)"],
    totalDeaths: statsArray["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const districtIdQuery = `
        SELECT 
            state_id
        FROM 
            district
        WHERE
            district_id = ${districtId};
    `;
  const firstQueryResponse = await db.get(districtIdQuery);
  const stateNameQuery = `
    SELECT 
        state_name AS stateName
    FROM 
        state
    WHERE 
        state_id = ${firstQueryResponse.state_id};
  `;
  const stateNameQueryResponse = await db.get(stateNameQuery);
  response.send(stateNameQueryResponse);
});

module.exports = app;
