async function checkRailway() {
  const token = process.env.RAILWAY_TOKEN;
  if (!token) {
    console.log("No RAILWAY_TOKEN found in environment.");
    return;
  }

  const query = `
    query {
      me {
        name
        email
      }
      projects {
        edges {
          node {
            id
            name
            services {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://backboard.railway.com/graphql/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log("Railway API Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Railway API Error:", err);
  }
}

checkRailway();
