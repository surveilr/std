# @surveilr/bootstrap-sql

Drizzle ORM schema for the RSSD (Resource Surveillance State Database) system.

## Installation

```bash
npm install @surveilr/bootstrap-sql better-sqlite3 drizzle-orm
```

## Initialization

To initialize the database using
[`surveilr`](https://github.com/surveilr/packages), run the following commands:

```bash
# Ingest files to create the initial database
surveilr ingest files -d rssd.db
```

## Usage

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@surveilr/bootstrap-sql";

const sqlite = new Database("rssd.db");
const db = drizzle(sqlite, { schema });

// Use your type-safe database
const devices = await db.select().from(schema.device);

console.log(devices);
```

## Structure

- `models.ts`: Table definitions
- `relations.ts`: Table relations
- `views.ts`: SQL view definitions (Drizzle-based)
- `index.ts`: Main entry point exporting all schemas
