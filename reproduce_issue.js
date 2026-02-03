
const fetch = require('node-fetch'); // Needs node-fetch or use built-in fetch in newer Node

const query = `
  query {
    valetAssignmentStats {
      totalValets
    }
  }
`;

async function testServer() {
    try {
        const response = await fetch('http://localhost:4000/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        const result = await response.json();
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testServer();
