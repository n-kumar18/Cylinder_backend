const express = require('express');
const mysql = require('mysql2/promise'); // Import the MySQL driver
const cors = require('cors');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Naveen#98142',
  database: 'cylinderDB', // Make sure this database exists in your MySQL server
//   timezone: 'Asia/Kolkata',
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/receive-cylinder', async (req, res) => {
    const { serialNo, weight } = req.body;
  
    try {
      // Get a connection from the pool
      const connection = await pool.getConnection();
  
      // Check if the cylinder exists in the database
      const [existingRows] = await connection.query(
        'SELECT * FROM cylinders WHERE CylinderNo = ?',
        [serialNo]
      );
  
      if (existingRows.length === 0) {
        // Cylinder does not exist in the database, allow receiving
        // Insert a new record for the cylinder
        const query = `
          INSERT INTO cylinders (CylinderNo, ReceiveDate, ReturnDate, ReceivedWeight, ReturnedWeight)
          VALUES (
            ?,
            ?,
            NULL,
            ?,
            NULL
          )
        `;
        const currentDate = new Date();
  
        const [result] = await connection.query(query, [serialNo, currentDate, weight]);
        
        connection.release(); // Release the connection back to the pool
        
        if (result.affectedRows === 1) {
          res.json({ message: 'Cylinder received successfully.' });
        } else {
          res.json({ message: 'An error occurred while receiving the cylinder.' });
        }
      } else {
        const existingCylinder = existingRows[0];
        
        if (existingCylinder.ReturnDate === null) {
          // Cylinder has already been received but not returned, cannot receive it again
          connection.release();
          return res.json({ message: 'Cylinder has already been received and cannot be received again.' });
        } else {
          // Cylinder was received and returned in the past, so update the receive date, receive weight, and clear the return date and returned weight
          const updateQuery = 'UPDATE cylinders SET ReceiveDate = NOW(), ReceivedWeight = ?, ReturnDate = NULL, ReturnedWeight = NULL WHERE CylinderNo = ?';
          const [result] = await connection.query(updateQuery, [weight, serialNo]);
  
          connection.release(); // Release the connection back to the pool
  
          if (result.affectedRows === 1) {
            res.json({ message: 'Cylinder received successfully.' });
          } else {
            res.json({ message: 'An error occurred while updating the cylinder information.' });
          }
        }
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
  

  app.post('/return-cylinder', async (req, res) => {
    const { serialNo, weight } = req.body;
  
    try {
      // Get a connection from the pool
      const connection = await pool.getConnection();
  
      // Check if the cylinder exists in the database
      const [existingRows] = await connection.query(
        'SELECT * FROM cylinders WHERE CylinderNo = ?',
        [serialNo]
      );
  
      if (existingRows.length === 0) {
        // Cylinder does not exist in the database
        connection.release();
        return res.json({ message: 'Cylinder does not exist in the database.' });
      }
  
      const existingCylinder = existingRows[0];
  
      if (existingCylinder.ReturnDate !== null) {
        // Cylinder has already been returned
        connection.release();
        return res.json({ message: 'Cylinder has already been returned.' });
      }
  
      // Update the cylinder's return date and weight
      const updateQuery = 'UPDATE cylinders SET ReturnDate = ?, ReturnedWeight = ? WHERE CylinderNo = ?';
      const currentDate = new Date();
  
      await connection.query(updateQuery, [currentDate, weight, serialNo]);
  
      connection.release(); // Release the connection back to the pool
  
      res.json({ message: 'Cylinder returned successfully.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });

  // Add this route to your Express.js application
app.get('/get-all-cylinders', async (req, res) => {
    try {
      // Get a connection from the pool
      const connection = await pool.getConnection();
  
      // Retrieve all cylinder records from the database
      const [rows] = await connection.query('SELECT * FROM cylinders');
  
      connection.release(); // Release the connection back to the pool
  
      res.json(rows); // Return the cylinder records as JSON data
    } catch (error) {
      console.error('Error fetching all cylinder data:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
  
  
  

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
