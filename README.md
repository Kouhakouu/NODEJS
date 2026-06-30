# PROJECT1

## Overview
This backend project is built for use together with the React frontend repository at https://github.com/Kouhakouu/REACTJS. It uses Neon PostgreSQL as its database and connects through the `DATABASE_URL` environment variable.

## Prerequisites
- Node.js 18 or higher
- npm
- A Neon database account
- The React frontend repository cloned locally

## Configuration
Create a `.env` file in the project root with your Neon connection string:

```env
DATABASE_URL=postgres://<user>:<password>@<host>/<database>?sslmode=require
PORT=8000
```

## Installation and Running

### 1. Clone both projects
```sh
git clone https://github.com/Kouhakouu/REACTJS

git clone <this-backend-repo-url>
```

### 2. Install backend dependencies
```sh
cd NODEJS
npm install
```

### 3. Configure the backend
- Create the `.env` file as shown in `.env.example`.
- Make sure your Neon database is created and reachable.
- If needed, run the migration files in the `src/migrations` folder.

### 4. Start the backend
```sh
npm start
```

The backend will run on `http://localhost:8000`.

### 5. Configure and start the React frontend
In the React project folder:
```sh
npm install
```

Set the frontend API base URL to the backend URL, for example:
```env
NEXT_PUBLIC_BACKEND_PORT=http://localhost:8000
```

Then start the frontend:
```sh
npm run dev
```

The frontend should open on `http://localhost:3000`.

## Usage
After both services are running, the frontend will communicate with this backend through `http://localhost:8000`.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.