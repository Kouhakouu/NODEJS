# PROJECT1

## Overview
This project is a Node.js application that requires configuration and setup of SQL Server Management.

## Configuration
To configure the application, you need to set up the `config.json` file located in the root directory. Below is an example of what the `config.json` file should look like:

```json
{
    "database": {
        "host": "localhost",
        "port": 1433,
        "user": "your_username",
        "password": "your_password",
        "database": "your_database"
    }
}
```

Make sure to replace `your_username`, `your_password`, and `your_database` with your actual database credentials.

## Installation

### Prerequisites
- Node.js (v14 or higher)
- SQL Server Management Studio (SSMS)

### Steps

1. **Install dependencies:**
     ```sh
     npm install
     ```

2. **Set up SQL Server Management Studio:**
     - Download and install SQL Server Management Studio from the [official website](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms).
     - Open SSMS and connect to your SQL Server instance.
     - Create a new database or use an existing one.
     - Update the `config.json` file with your database details.

3. **Run the application:**
     ```sh
     npm start
     ```

## Usage
After starting the application with REACTJS folder, it should be accessible at `http://localhost:3000`.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.