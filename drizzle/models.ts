import {
  AnySQLiteColumn,
  blob,
  check,
  customType,
  foreignKey,
  index,
  integer,
  numeric,
  real,
  SQLiteColumn,
  sqliteTable as table,
  sqliteView,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Custom types to match legacy SQL types
const timestamptz = customType<{ data: string; driverData: string }>({
  dataType() { return 'TIMESTAMPTZ'; },
  fromDriver(value: string) { return value; },
  toDriver(value: string) { return value; }
});

const date = customType<{ data: string; driverData: string }>({
  dataType() { return 'DATE'; },
  fromDriver(value: string) { return value; },
  toDriver(value: string) { return value; }
});

const ulid = customType<{ data: string; driverData: string }>({
  dataType() { return 'ULID'; },
  fromDriver(value: string) { return value; },
  toDriver(value: string) { return value; }
});

const varchar = customType<{ data: string; driverData: string }>({
  dataType() { return 'VARCHAR'; },
  fromDriver(value: string) { return value; },
  toDriver(value: string) { return value; }
});

const textArray = customType<{ data: string[]; driverData: string }>({
  dataType() { return 'TEXT[]'; },
  fromDriver(value: string) { return JSON.parse(value); },
  toDriver(value: string[]) { return JSON.stringify(value); }
});

export const housekeeping = {
  createdAt: timestamptz("created_at").default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by").default("UNKNOWN"),
  updatedAt: timestamptz("updated_at"),
  updatedBy: text("updated_by"),
  deletedAt: timestamptz("deleted_at"),
  deletedBy: text("deleted_by"),
  activityLog: text("activity_log"),
};

export const sqleanDefine = table("sqlean_define", {
  name: text().primaryKey(),
  type: text(),
  body: text(),
}, (table) => []);

// Note: session_state_ephemeral is created as TEMP table in bootstrap
// It should not be part of the persistent schema

export const checkJSON = (c: SQLiteColumn) =>
  check(`${c.name}_check_valid_json`, sql`json_valid(${c}) OR ${c} IS NULL`);

export const assuranceSchema = table("assurance_schema", {
  assuranceSchemaId: varchar("assurance_schema_id").primaryKey().notNull(),
  assuranceType: text("assurance_type").notNull(),
  code: text().notNull(),
  codeJson: text("code_json", { mode: "json" }),
  governance: text(),
  ...housekeeping,
}, (table) => [
  checkJSON(table.codeJson),
  checkJSON(table.governance),
]);


export const device = table("device", {
  deviceId: varchar("device_id").primaryKey().notNull(),
  name: text().notNull(),
  state: text().notNull(),
  boundary: text().notNull(),
  segmentation: text(),
  stateSysinfo: text("state_sysinfo"),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_device__name__state").on(table.name, table.state),
  unique().on(table.name, table.state, table.boundary),
  checkJSON(table.state),
  checkJSON(table.segmentation),
  checkJSON(table.stateSysinfo),
  checkJSON(table.elaboration),
]);


export const codeNotebookKernel = table("code_notebook_kernel", {
  codeNotebookKernelId: varchar("code_notebook_kernel_id").primaryKey().notNull(),
  kernelName: text("kernel_name").notNull(),
  description: text(),
  mimeType: text("mime_type"),
  fileExtn: text("file_extn"),
  elaboration: text(),
  governance: text(),
  ...housekeeping,
}, (table) => [
  unique().on(table.kernelName),
  checkJSON(table.elaboration),
  checkJSON(table.governance),
]);


export const codeNotebookCell = table("code_notebook_cell", {
  codeNotebookCellId: varchar("code_notebook_cell_id").primaryKey().notNull(),
  notebookKernelId: varchar("notebook_kernel_id").notNull().references(() =>
    codeNotebookKernel.codeNotebookKernelId
  ),
  notebookName: text("notebook_name").notNull(),
  cellName: text("cell_name").notNull(),
  cellGovernance: text("cell_governance"),
  interpretableCode: text("interpretable_code").notNull(),
  interpretableCodeHash: text("interpretable_code_hash").notNull(),
  description: text(),
  arguments: text(),
  ...housekeeping,
}, (table) => [
  unique().on(table.notebookName, table.cellName, table.interpretableCodeHash),
  checkJSON(table.cellGovernance),
  checkJSON(table.arguments),
]);


export const codeNotebookState = table("code_notebook_state", {
  codeNotebookStateId: varchar("code_notebook_state_id").primaryKey().notNull(),
  codeNotebookCellId: varchar("code_notebook_cell_id").notNull().references(() =>
    codeNotebookCell.codeNotebookCellId
  ),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  transitionResult: text("transition_result"),
  transitionReason: text("transition_reason"),
  transitionedAt: timestamptz("transitioned_at"),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  unique().on(table.codeNotebookCellId, table.fromState, table.toState),
  checkJSON(table.transitionResult),
  checkJSON(table.elaboration),
]);


export const sqlpageFiles = table("sqlpage_files", {
  path: text().primaryKey().notNull(),
  contents: text().notNull(),
  lastModified: numeric("last_modified").default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => []);

export const surveilrTableSize = table("surveilr_table_size", {
  tableName: text("table_name").primaryKey(),
  tableSizeMb: real("table_size_mb"),
}, (table) => []);

export const sqlpageAideNavigation = table("sqlpage_aide_navigation", {
  path: text().notNull(),
  caption: text().notNull(),
  namespace: text().notNull(),
  parentPath: text("parent_path"),
  siblingOrder: integer("sibling_order"),
  url: text(),
  title: text(),
  abbreviatedCaption: text("abbreviated_caption"),
  description: text(),
  elaboration: text(),
}, (table) => [
  unique("unq_ns_path").on(table.namespace, table.parentPath, table.path)
]);

export const partyType = table("party_type", {
  partyTypeId: ulid("party_type_id").primaryKey().notNull(),
  code: text().notNull(),
  value: text().notNull(),
  ...housekeeping,
}, (table) => [
  unique("unq_party_type_code").on(table.code)
]);


export const party = table("party", {
  partyId: varchar("party_id").primaryKey().notNull(),
  partyTypeId: ulid("party_type_id").notNull().references(() =>
    partyType.partyTypeId
  ).$type<string>(), // ULID
  partyName: text("party_name").notNull(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_party__party_type_id__party_name").on(
    table.partyTypeId,
    table.partyName,
  ),
]);


export const partyRelationType = table("party_relation_type", {
  partyRelationTypeId: text("party_relation_type_id").primaryKey().notNull().$type<string>(), // ULID
  code: text().notNull(),
  value: text().notNull(),
  ...housekeeping,
}, (table) => [
  unique().on(table.code),
]);


export const partyRelation = table("party_relation", {
  partyRelationId: varchar("party_relation_id").primaryKey().notNull(),
  partyId: text("party_id").notNull().references(() => party.partyId),
  relatedPartyId: text("related_party_id").notNull().references(() =>
    party.partyId
  ),
  relationTypeId: text("relation_type_id").notNull().references(() =>
    partyRelationType.partyRelationTypeId
  ).$type<string>(), // ULID
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_party_relation__party_id__related_party_id__relation_type_id").on(
    table.partyId,
    table.relatedPartyId,
    table.relationTypeId,
  ),
  unique().on(table.partyId, table.relatedPartyId, table.relationTypeId),
  checkJSON(table.elaboration),
]);


export const genderType = table("gender_type", {
  genderTypeId: ulid("gender_type_id").primaryKey().notNull(),
  code: text().notNull(),
  value: text().notNull(),
  ...housekeeping,
}, (table) => [
  unique().on(table.code),
]);


export const sexType = table("sex_type", {
  sexTypeId: ulid("sex_type_id").primaryKey().notNull(),
  code: text().notNull(),
  value: text().notNull(),
  ...housekeeping,
}, (table) => [
  unique().on(table.code),
]);


export const personType = table("person_type", {
  personTypeId: ulid("person_type_id").primaryKey().notNull(),
  code: text().notNull(),
  value: text().notNull(),
  ...housekeeping,
}, (table) => [
  unique().on(table.code),
]);


export const person = table("person", {
  personId: ulid("person_id").primaryKey().notNull(),
  partyId: text("party_id").notNull().references(() => party.partyId),
  personTypeId: ulid("person_type_id").notNull().references(() =>
    personType.personTypeId
  ),
  personFirstName: text("person_first_name").notNull(),
  personMiddleName: text("person_middle_name"),
  personLastName: text("person_last_name").notNull(),
  previousName: text("previous_name"),
  honorificPrefix: text("honorific_prefix"),
  honorificSuffix: text("honorific_suffix"),
  genderId: ulid("gender_id").notNull().references(() =>
    genderType.genderTypeId
  ),
  sexId: ulid("sex_id").notNull().references(() => sexType.sexTypeId),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  checkJSON(table.elaboration),
]);


export const organization = table("organization", {
  organizationId: ulid("organization_id").primaryKey().notNull(),
  partyId: text("party_id").notNull().references(() => party.partyId),
  name: text().notNull(),
  alias: text(),
  description: text(),
  license: text().notNull(),
  federalTaxIdNum: text("federal_tax_id_num"),
  registrationDate: date("registration_date").notNull(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  checkJSON(table.elaboration),
]);


export const organizationRoleType = table("organization_role_type", {
  organizationRoleTypeId: ulid("organization_role_type_id").primaryKey()
    .notNull(),
  code: text().notNull(),
  value: text().notNull(),
  ...housekeeping,
}, (table) => [
  unique().on(table.code),
]);


export const organizationRole = table("organization_role", {
  organizationRoleId: text("organization_role_id").primaryKey().notNull(),
  personId: text("person_id").notNull().references(() => party.partyId),
  organizationId: text("organization_id").notNull().references(() =>
    party.partyId
  ),
  organizationRoleTypeId: ulid("organization_role_type_id").notNull()
    .references(() => organizationRoleType.organizationRoleTypeId),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index(
    "idx_organization_role__person_id__organization_id__organization_role_type_id",
  ).on(table.personId, table.organizationId, table.organizationRoleTypeId),
  unique().on(table.personId, table.organizationId, table.organizationRoleTypeId),
  checkJSON(table.elaboration),
]);


export const devicePartyRelationship = table("device_party_relationship", {
  devicePartyRelationshipId: text("device_party_relationship_id").primaryKey()
    .notNull(),
  deviceId: text("device_id").notNull().references(() => device.deviceId),
  partyId: text("party_id").notNull().references(() => party.partyId),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_device_party_relationship__device_id__party_id").on(
    table.deviceId,
    table.partyId,
  ),
  unique().on(table.deviceId, table.partyId),
  checkJSON(table.elaboration),
]);


export const behavior = table("behavior", {
  behaviorId: varchar("behavior_id").primaryKey().notNull(),
  deviceId: text("device_id").notNull(),
  behaviorName: text("behavior_name").notNull(),
  behaviorConfJson: text("behavior_conf_json").notNull(),
  assuranceSchemaId: text("assurance_schema_id"),
  governance: text(),
  ...housekeeping,
}, (table) => [
  unique().on(table.deviceId, table.behaviorName),
  checkJSON(table.behaviorConfJson),
  checkJSON(table.governance),
]);


export const urIngestResourcePathMatchRule = table(
  "ur_ingest_resource_path_match_rule",
  {
    urIngestResourcePathMatchRuleId: text(
      "ur_ingest_resource_path_match_rule_id",
    ).primaryKey().notNull(),
    namespace: text().notNull(),
    regex: text().notNull(),
    flags: text().notNull(),
    nature: text(),
    priority: text(),
    description: text(),
    includeGlobPatterns: textArray("include_glob_patterns"),
    excludeGlobPatterns: textArray("exclude_glob_patterns"),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    checkJSON(table.elaboration),
    unique("unq_path_match_regex").on(table.namespace, table.regex),
  ],
);

export const urIngestResourcePathRewriteRule = table(
  "ur_ingest_resource_path_rewrite_rule",
  {
    urIngestResourcePathRewriteRuleId: text(
      "ur_ingest_resource_path_rewrite_rule_id",
    ).primaryKey().notNull(),
    namespace: text().notNull(),
    regex: text().notNull(),
    replace: text().notNull(),
    priority: text(),
    description: text(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.namespace, table.regex, table.replace),
    checkJSON(table.elaboration),
  ],
);

export const urIngestSession = table("ur_ingest_session", {
  urIngestSessionId: text("ur_ingest_session_id").primaryKey().notNull(),
  deviceId: text("device_id").notNull().references(() => device.deviceId),
  behaviorId: text("behavior_id").references(() => behavior.behaviorId),
  behaviorJson: text("behavior_json"),
  ingestStartedAt: timestamptz("ingest_started_at").notNull(),
  ingestFinishedAt: timestamptz("ingest_finished_at"),
  sessionAgent: text("session_agent").notNull(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  unique().on(table.deviceId, table.createdAt),
  checkJSON(table.behaviorJson),
  checkJSON(table.sessionAgent),
  checkJSON(table.elaboration),
]);


export const urIngestSessionFsPath = table("ur_ingest_session_fs_path", {
  urIngestSessionFsPathId: text("ur_ingest_session_fs_path_id").primaryKey()
    .notNull(),
  ingestSessionId: text("ingest_session_id").notNull().references(() =>
    urIngestSession.urIngestSessionId
  ),
  rootPath: text("root_path").notNull(),
  includeGlobPatterns: textArray("include_glob_patterns"),
  excludeGlobPatterns: textArray("exclude_glob_patterns"),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_ur_ingest_session_fs_path__ingest_session_id__root_path").on(
    table.ingestSessionId,
    table.rootPath,
  ),
  unique().on(table.ingestSessionId, table.rootPath, table.createdAt),
  checkJSON(table.elaboration),
]);


export const uniformResource = table("uniform_resource", {
  uniformResourceId: text("uniform_resource_id").primaryKey().notNull(),
  deviceId: text("device_id").notNull().references(() => device.deviceId),
  ingestSessionId: text("ingest_session_id").notNull().references(() =>
    urIngestSession.urIngestSessionId
  ),
  ingestFsPathId: text("ingest_fs_path_id").references(() =>
    urIngestSessionFsPath.urIngestSessionFsPathId
  ),
  ingestSessionImapAcctFolderMessage: text(
    "ingest_session_imap_acct_folder_message",
  ).references(() =>
    urIngestSessionImapAcctFolderMessage.urIngestSessionImapAcctFolderMessageId
  ),
  ingestIssueAcctProjectId: text("ingest_issue_acct_project_id").references(() =>
    urIngestSessionPlmAcctProject.urIngestSessionPlmAcctProjectId
  ),
  uri: text().notNull(),
  contentDigest: text("content_digest").notNull(),
  content: blob(),
  nature: text(),
  sizeBytes: integer("size_bytes"),
  lastModifiedAt: timestamptz("last_modified_at"),
  contentFmBodyAttrs: text("content_fm_body_attrs"),
  frontmatter: text(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_uniform_resource__device_id__uri").on(table.deviceId, table.uri),
  unique().on(table.deviceId, table.contentDigest, table.uri, table.sizeBytes),
  checkJSON(table.contentFmBodyAttrs),
  checkJSON(table.frontmatter),
  checkJSON(table.elaboration),
]);


export const uniformResourceTransform = table("uniform_resource_transform", {
  uniformResourceTransformId: text("uniform_resource_transform_id").primaryKey()
    .notNull(),
  uniformResourceId: text("uniform_resource_id").notNull().references(() =>
    uniformResource.uniformResourceId
  ),
  uri: text().notNull(),
  contentDigest: text("content_digest").notNull(),
  content: text(),
  nature: text(),
  sizeBytes: integer("size_bytes"),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_uniform_resource_transform__uniform_resource_id__content_digest")
    .on(table.uniformResourceId, table.contentDigest),
  unique().on(table.uniformResourceId, table.contentDigest, table.nature, table.sizeBytes),
  checkJSON(table.elaboration),
]);


export const urIngestSessionFsPathEntry = table(
  "ur_ingest_session_fs_path_entry",
  {
    urIngestSessionFsPathEntryId: text("ur_ingest_session_fs_path_entry_id")
      .primaryKey().notNull(),
    ingestSessionId: text("ingest_session_id").notNull().references(() =>
      urIngestSession.urIngestSessionId
    ),
    ingestFsPathId: text("ingest_fs_path_id").notNull().references(() =>
      urIngestSessionFsPath.urIngestSessionFsPathId
    ),
    uniformResourceId: text("uniform_resource_id").references(() =>
      uniformResource.uniformResourceId
    ),
    filePathAbs: text("file_path_abs").notNull(),
    filePathRelParent: text("file_path_rel_parent").notNull(),
    filePathRel: text("file_path_rel").notNull(),
    fileBasename: text("file_basename").notNull(),
    fileExtn: text("file_extn"),
    capturedExecutable: text("captured_executable"),
    urStatus: text("ur_status"),
    urDiagnostics: text("ur_diagnostics"),
    urTransformations: text("ur_transformations"),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    index(
      "idx_ur_ingest_session_fs_path_entry__ingest_session_id__file_path_abs",
    ).on(table.ingestSessionId, table.filePathAbs),
    unique(
      "uq_ur_ingest_session_fs_path_entry__ingest_session_id__ingest_fs_path_id__file_path_abs"
    ).on(table.ingestSessionId, table.ingestFsPathId, table.filePathAbs),
    checkJSON(table.capturedExecutable),
    checkJSON(table.urDiagnostics),
    checkJSON(table.urTransformations),
    checkJSON(table.elaboration),
  ],
);


export const urIngestSessionTask = table("ur_ingest_session_task", {
  urIngestSessionTaskId: text("ur_ingest_session_task_id").primaryKey()
    .notNull(),
  ingestSessionId: text("ingest_session_id").notNull().references(() =>
    urIngestSession.urIngestSessionId
  ),
  uniformResourceId: text("uniform_resource_id").references(() =>
    uniformResource.uniformResourceId
  ),
  capturedExecutable: text("captured_executable").notNull(),
  urStatus: text("ur_status"),
  urDiagnostics: text("ur_diagnostics"),
  urTransformations: text("ur_transformations"),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_ur_ingest_session_task__ingest_session_id").on(
    table.ingestSessionId,
  ),
  checkJSON(table.capturedExecutable),
  checkJSON(table.urDiagnostics),
  checkJSON(table.urTransformations),
  checkJSON(table.elaboration),
]);


export const urIngestSessionImapAccount = table(
  "ur_ingest_session_imap_account",
  {
    urIngestSessionImapAccountId: text("ur_ingest_session_imap_account_id")
      .primaryKey().notNull(),
    ingestSessionId: text("ingest_session_id").notNull().references(() =>
      urIngestSession.urIngestSessionId
    ),
    email: text(),
    password: text(),
    host: text(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    index("idx_ur_ingest_session_imap_account__ingest_session_id__email").on(
      table.ingestSessionId,
      table.email,
    ),
    unique().on(table.ingestSessionId, table.email),
  ],
);


export const urIngestSessionImapAcctFolder = table(
  "ur_ingest_session_imap_acct_folder",
  {
    urIngestSessionImapAcctFolderId: text(
      "ur_ingest_session_imap_acct_folder_id",
    ).primaryKey().notNull(),
    ingestSessionId: text("ingest_session_id").notNull().references(() =>
      urIngestSession.urIngestSessionId
    ),
    ingestAccountId: text("ingest_account_id").notNull().references(() =>
      urIngestSessionImapAccount.urIngestSessionImapAccountId
    ),
    folderName: text("folder_name").notNull(),
    includeSenders: textArray("include_senders"),
    excludeSenders: textArray("exclude_senders"),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    index(
      "idx_ur_ingest_session_imap_acct_folder__ingest_session_id__folder_name",
    ).on(table.ingestSessionId, table.folderName),
    unique().on(table.ingestAccountId, table.folderName),
  ],
);


export const urIngestSessionImapAcctFolderMessage = table(
  "ur_ingest_session_imap_acct_folder_message",
  {
    urIngestSessionImapAcctFolderMessageId: text(
      "ur_ingest_session_imap_acct_folder_message_id",
    ).primaryKey().notNull(),
    ingestSessionId: text("ingest_session_id").notNull().references(() =>
      urIngestSession.urIngestSessionId
    ),
    ingestImapAcctFolderId: text("ingest_imap_acct_folder_id").notNull()
      .references(() =>
        urIngestSessionImapAcctFolder.urIngestSessionImapAcctFolderId
      ),
    message: text().notNull(),
    messageId: text("message_id").notNull(),
    subject: text().notNull(),
    from: text().notNull(),
    cc: text().notNull(),
    bcc: text().notNull(),
    status: textArray().notNull(),
    date: date(),
    emailReferences: text("email_references").notNull(),
    ...housekeeping,
  },
  (table) => [
    index("idx_ur_ingest_session_imap_acct_folder_message__ingest_session_id")
      .on(table.ingestSessionId),
    unique().on(table.message, table.messageId),
    checkJSON(table.cc),
    checkJSON(table.bcc),
    checkJSON(table.emailReferences),
  ],
);


export const urIngestSessionPlmAccount = table(
  "ur_ingest_session_plm_account",
  {
    urIngestSessionPlmAccountId: varchar("ur_ingest_session_plm_account_id")
      .primaryKey().notNull(),
    ingestSessionId: text("ingest_session_id").notNull().references(() =>
      urIngestSession.urIngestSessionId
    ),
    provider: text().notNull(),
    orgName: text("org_name").notNull(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.provider, table.orgName),
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmAcctProject = table(
  "ur_ingest_session_plm_acct_project",
  {
    urIngestSessionPlmAcctProjectId: varchar(
      "ur_ingest_session_plm_acct_project_id",
    ).primaryKey().notNull(),
    ingestSessionId: text("ingest_session_id").notNull().references(() =>
      urIngestSession.urIngestSessionId
    ),
    ingestAccountId: text("ingest_account_id").notNull().references(() =>
      urIngestSessionPlmAccount.urIngestSessionPlmAccountId
    ),
    parentProjectId: text("parent_project_id"),
    name: text().notNull(),
    description: text(),
    id: text(),
    key: text(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.name, table.description),
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmUser = table("ur_ingest_session_plm_user", {
  urIngestSessionPlmUserId: varchar("ur_ingest_session_plm_user_id").primaryKey()
    .notNull(),
  userId: text("user_id").notNull(),
  login: text().notNull(),
  email: text(),
  name: text(),
  url: text().notNull(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  unique().on(table.userId, table.login),
  checkJSON(table.elaboration),
]);

export const urIngestSessionPlmIssueType = table(
  "ur_ingest_session_plm_issue_type",
  {
    urIngestSessionPlmIssueTypeId: varchar("ur_ingest_session_plm_issue_type_id")
      .primaryKey().notNull(),
    avatarId: text("avatar_id"),
    description: text().notNull(),
    iconUrl: text("icon_url").notNull(),
    id: text().notNull(),
    name: text().notNull(),
    subtask: integer().notNull(),
    url: text().notNull(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.id, table.name),
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmAcctProjectIssue = table(
  "ur_ingest_session_plm_acct_project_issue",
  {
    urIngestSessionPlmAcctProjectIssueId: varchar(
      "ur_ingest_session_plm_acct_project_issue_id",
    ).primaryKey().notNull(),
    ingestSessionId: text("ingest_session_id").notNull().references(() =>
      urIngestSession.urIngestSessionId
    ),
    urIngestSessionPlmAcctProjectId: text(
      "ur_ingest_session_plm_acct_project_id",
    ).notNull().references(() =>
      urIngestSessionPlmAcctProject.urIngestSessionPlmAcctProjectId
    ),
    uniformResourceId: text("uniform_resource_id").references(() =>
      uniformResource.uniformResourceId
    ),
    issueId: text("issue_id").notNull(),
    issueNumber: integer("issue_number"),
    parentIssueId: text("parent_issue_id"),
    title: text().notNull(),
    body: text(),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    state: text().notNull(),
    assignedTo: text("assigned_to"),
    user: text().notNull().references(() =>
      urIngestSessionPlmUser.urIngestSessionPlmUserId
    ),
    url: text().notNull(),
    closedAt: text("closed_at"),
    issueTypeId: text("issue_type_id").references(() =>
      urIngestSessionPlmIssueType.urIngestSessionPlmIssueTypeId
    ),
    timeEstimate: integer("time_estimate"),
    aggregateTimeEstimate: integer("aggregate_time_estimate"),
    timeOriginalEstimate: integer("time_original_estimate"),
    timeSpent: integer("time_spent"),
    aggregateTimeSpent: integer("aggregate_time_spent"),
    aggregateTimeOriginalEstimate: integer("aggregate_time_original_estimate"),
    workratio: integer(),
    currentProgress: integer("current_progress"),
    totalProgress: integer("total_progress"),
    resolutionName: text("resolution_name"),
    resolutionDate: text("resolution_date"),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.title, table.issueId, table.state, table.assignedTo),
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmAcctLabel = table(
  "ur_ingest_session_plm_acct_label",
  {
    urIngestSessionPlmAcctLabelId: varchar("ur_ingest_session_plm_acct_label_id")
      .primaryKey().notNull(),
    urIngestSessionPlmAcctProjectId: text(
      "ur_ingest_session_plm_acct_project_id",
    ).notNull().references(() =>
      urIngestSessionPlmAcctProject.urIngestSessionPlmAcctProjectId
    ),
    urIngestSessionPlmAcctProjectIssueId: text(
      "ur_ingest_session_plm_acct_project_issue_id",
    ).notNull().references(() =>
      urIngestSessionPlmAcctProjectIssue.urIngestSessionPlmAcctProjectIssueId
    ),
    label: text().notNull(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmMilestone = table(
  "ur_ingest_session_plm_milestone",
  {
    urIngestSessionPlmMilestoneId: varchar("ur_ingest_session_plm_milestone_id")
      .primaryKey().notNull(),
    urIngestSessionPlmAcctProjectId: text(
      "ur_ingest_session_plm_acct_project_id",
    ).notNull().references(() =>
      urIngestSessionPlmAcctProject.urIngestSessionPlmAcctProjectId
    ),
    title: text().notNull(),
    milestoneId: text("milestone_id").notNull(),
    url: text().notNull(),
    htmlUrl: text("html_url").notNull(),
    openIssues: integer("open_issues"),
    closedIssues: integer("closed_issues"),
    dueOn: timestamptz("due_on"),
    closedAt: timestamptz("closed_at"),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmAcctRelationship = table(
  "ur_ingest_session_plm_acct_relationship",
  {
    urIngestSessionPlmAcctRelationshipId: varchar(
      "ur_ingest_session_plm_acct_relationship_id",
    ).primaryKey().notNull(),
    urIngestSessionPlmAcctProjectIdPrime: text(
      "ur_ingest_session_plm_acct_project_id_prime",
    ).notNull().references(() =>
      urIngestSessionPlmAcctProject.urIngestSessionPlmAcctProjectId
    ),
    urIngestSessionPlmAcctProjectIdRelated: text(
      "ur_ingest_session_plm_acct_project_id_related",
    ).notNull(),
    urIngestSessionPlmAcctProjectIssueIdPrime: text(
      "ur_ingest_session_plm_acct_project_issue_id_prime",
    ).notNull().references(() =>
      urIngestSessionPlmAcctProjectIssue.urIngestSessionPlmAcctProjectIssueId
    ),
    urIngestSessionPlmAcctProjectIssueIdRelated: text(
      "ur_ingest_session_plm_acct_project_issue_id_related",
    ).notNull(),
    relationship: text(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmComment = table(
  "ur_ingest_session_plm_comment",
  {
    urIngestSessionPlmCommentId: varchar("ur_ingest_session_plm_comment_id")
      .primaryKey().notNull(),
    urIngestSessionPlmAcctProjectIssueId: text(
      "ur_ingest_session_plm_acct_project_issue_id",
    ).notNull().references(() =>
      urIngestSessionPlmAcctProjectIssue.urIngestSessionPlmAcctProjectIssueId
    ),
    commentId: text("comment_id").notNull(),
    nodeId: text("node_id").notNull(),
    url: text().notNull(),
    body: text(),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    user: text().notNull().references(() =>
      urIngestSessionPlmUser.urIngestSessionPlmUserId
    ),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.commentId, table.url, table.body),
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmReaction = table(
  "ur_ingest_session_plm_reaction",
  {
    urIngestSessionPlmReactionId: varchar("ur_ingest_session_plm_reaction_id")
      .primaryKey().notNull(),
    reactionId: text("reaction_id").notNull(),
    reactionType: text("reaction_type").notNull(),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.reactionType),
    checkJSON(table.elaboration),
  ],
);

export const urIngestSessionPlmIssueReaction = table(
  "ur_ingest_session_plm_issue_reaction",
  {
    urIngestSessionPlmIssueReactionId: varchar(
      "ur_ingest_session_plm_issue_reaction_id",
    ).primaryKey().notNull(),
    urIngestPlmReactionId: text("ur_ingest_plm_reaction_id").notNull()
      .references(() => urIngestSessionPlmReaction.urIngestSessionPlmReactionId),
    urIngestPlmIssueId: text("ur_ingest_plm_issue_id").notNull().references(() =>
      urIngestSessionPlmAcctProjectIssue.urIngestSessionPlmAcctProjectIssueId
    ),
    count: integer().default(1),
    elaboration: text(),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.urIngestPlmIssueId, table.urIngestPlmReactionId),
    checkJSON(table.elaboration),
  ],
);



export const urIngestSessionAttachment = table("ur_ingest_session_attachment", {
  urIngestSessionAttachmentId: text("ur_ingest_session_attachment_id")
    .primaryKey().notNull(),
  uniformResourceId: text("uniform_resource_id").references(() =>
    uniformResource.uniformResourceId
  ),
  name: text(),
  uri: text().notNull(),
  content: blob(),
  nature: text(),
  size: integer(),
  checksum: text(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_ur_ingest_session_attachment__uniform_resource_id__content").on(
    table.uniformResourceId,
    table.content,
  ),
  unique().on(table.uniformResourceId, table.checksum, table.nature, table.size),
]);


export const urIngestSessionUdiPgpSql = table("ur_ingest_session_udi_pgp_sql", {
  urIngestSessionUdiPgpSqlId: text("ur_ingest_session_udi_pgp_sql_id")
    .primaryKey().notNull(),
  sql: text().notNull(),
  nature: text().notNull(),
  content: blob(),
  behaviour: text(),
  queryError: text("query_error"),
  uniformResourceId: text("uniform_resource_id").references(() =>
    uniformResource.uniformResourceId
  ),
  ingestSessionId: text("ingest_session_id").references(() =>
    urIngestSession.urIngestSessionId
  ),
  ...housekeeping,
}, (table) => [
  index("idx_ur_ingest_session_udi_pgp_sql__ingest_session_id").on(
    table.ingestSessionId,
  ),
  unique().on(table.sql, table.ingestSessionId),
  checkJSON(table.behaviour),
]);


export const orchestrationNature = table("orchestration_nature", {
  orchestrationNatureId: text("orchestration_nature_id").primaryKey().notNull(),
  nature: text().notNull(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_orchestration_nature__orchestration_nature_id__nature").on(
    table.orchestrationNatureId,
    table.nature,
  ),
  unique().on(table.orchestrationNatureId, table.nature),
]);


export const orchestrationSession = table("orchestration_session", {
  orchestrationSessionId: text("orchestration_session_id").primaryKey()
    .notNull(),
  deviceId: text("device_id").notNull().references(() => device.deviceId),
  orchestrationNatureId: text("orchestration_nature_id").notNull().references(
    () => orchestrationNature.orchestrationNatureId
  ),
  version: text().notNull(),
  orchStartedAt: timestamptz("orch_started_at"),
  orchFinishedAt: timestamptz("orch_finished_at"),
  elaboration: text(),
  argsJson: text("args_json"),
  diagnosticsJson: text("diagnostics_json"),
  diagnosticsMd: text("diagnostics_md"),
}, (table) => [
  checkJSON(table.elaboration),
  checkJSON(table.argsJson),
  checkJSON(table.diagnosticsJson),
]);


export const orchestrationSessionEntry = table("orchestration_session_entry", {
  orchestrationSessionEntryId: text("orchestration_session_entry_id")
    .primaryKey().notNull(),
  sessionId: text("session_id").notNull().references(() =>
    orchestrationSession.orchestrationSessionId
  ),
  ingestSrc: text("ingest_src").notNull(),
  ingestTableName: text("ingest_table_name"),
  elaboration: text(),
}, (table) => []);


export const orchestrationSessionState = table("orchestration_session_state", {
  orchestrationSessionStateId: text("orchestration_session_state_id")
    .primaryKey().notNull(),
  sessionId: text("session_id").notNull().references(() =>
    orchestrationSession.orchestrationSessionId
  ),
  sessionEntryId: text("session_entry_id").references(() =>
    orchestrationSessionEntry.orchestrationSessionEntryId
  ),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  transitionResult: text("transition_result"),
  transitionReason: text("transition_reason"),
  transitionedAt: timestamptz("transitioned_at"),
  elaboration: text(),
}, (table) => [
  unique().on(table.orchestrationSessionStateId, table.fromState, table.toState),
]);


export const orchestrationSessionExec = table("orchestration_session_exec", {
  orchestrationSessionExecId: text("orchestration_session_exec_id").primaryKey()
    .notNull(),
  execNature: text("exec_nature").notNull(),
  sessionId: text("session_id").notNull().references(() =>
    orchestrationSession.orchestrationSessionId
  ),
  sessionEntryId: text("session_entry_id").references(() =>
    orchestrationSessionEntry.orchestrationSessionEntryId
  ),
  parentExecId: text("parent_exec_id"),
  namespace: text(),
  execIdentity: text("exec_identity"),
  execCode: text("exec_code").notNull(),
  execStatus: integer("exec_status").notNull(),
  inputText: text("input_text"),
  execErrorText: text("exec_error_text"),
  outputText: text("output_text"),
  outputNature: text("output_nature"),
  narrativeMd: text("narrative_md"),
  elaboration: text(),
}, (table) => [
  foreignKey(() => ({
    columns: [table.parentExecId],
    foreignColumns: [table.orchestrationSessionExecId],
    name:
      "orchestration_session_exec_parent_exec_id_orchestration_session_exec_orchestration_session_exec_id_fk",
  })),
]);

export const orchestrationSessionIssue = table("orchestration_session_issue", {
  orchestrationSessionIssueId: numeric("orchestration_session_issue_id")
    .primaryKey().notNull(),
  sessionId: text("session_id").notNull().references(() =>
    orchestrationSession.orchestrationSessionId
  ),
  sessionEntryId: text("session_entry_id").references(() =>
    orchestrationSessionEntry.orchestrationSessionEntryId
  ),
  issueType: text("issue_type").notNull(),
  issueMessage: text("issue_message").notNull(),
  issueRow: integer("issue_row"),
  issueColumn: text("issue_column"),
  invalidValue: text("invalid_value"),
  remediation: text(),
  elaboration: text(),
}, (table) => []);


export const orchestrationSessionIssueRelation = table(
  "orchestration_session_issue_relation",
  {
    orchestrationSessionIssueRelationId: numeric(
      "orchestration_session_issue_relation_id",
    ).primaryKey().notNull(),
    issueIdPrime: numeric("issue_id_prime").notNull().references(() =>
      orchestrationSessionIssue.orchestrationSessionIssueId
    ),
    issueIdRel: text("issue_id_rel").notNull(),
    relationshipNature: text("relationship_nature").notNull(),
    elaboration: text(),
  },
  (table) => [],
);


export const orchestrationSessionLog = table("orchestration_session_log", {
  orchestrationSessionLogId: numeric("orchestration_session_log_id")
    .primaryKey().notNull(),
  category: text(),
  parentExecId: numeric("parent_exec_id"),
  content: text().notNull(),
  siblingOrder: integer("sibling_order"),
  elaboration: text(),
}, (table) => [
  foreignKey(() => ({
    columns: [table.parentExecId],
    foreignColumns: [table.orchestrationSessionLogId],
    name:
      "orchestration_session_log_parent_exec_id_orchestration_session_log_orchestration_session_log_id_fk",
  })),
]);

export const uniformResourceGraph = table("uniform_resource_graph", {
  name: text().primaryKey().notNull(),
  elaboration: text(),
}, (table) => []);


export const uniformResourceEdge = table("uniform_resource_edge", {
  graphName: text("graph_name").notNull().references(() =>
    uniformResourceGraph.name
  ),
  nature: text().notNull(),
  nodeId: text("node_id").notNull(),
  uniformResourceId: text("uniform_resource_id").notNull().references(() =>
    uniformResource.uniformResourceId
  ),
  elaboration: text(),
}, (table) => [
  index("idx_uniform_resource_edge__uniform_resource_id").on(
    table.uniformResourceId,
  ),
  unique().on(table.graphName, table.nature, table.nodeId, table.uniformResourceId),
]);


export const surveilrOsqueryMsNode = table("surveilr_osquery_ms_node", {
  surveilrOsqueryMsNodeId: text("surveilr_osquery_ms_node_id").primaryKey()
    .notNull(),
  nodeKey: text("node_key").notNull(),
  hostIdentifier: text("host_identifier").notNull(),
  tlsCertSubject: text("tls_cert_subject"),
  osVersion: text("os_version").notNull(),
  platform: text().notNull(),
  lastSeen: numeric("last_seen").notNull(),
  status: text().default("active").notNull(),
  osqueryVersion: text("osquery_version"),
  osqueryBuildPlatform: text("osquery_build_platform").notNull(),
  deviceId: text("device_id").notNull().references(() => device.deviceId),
  behaviorId: text("behavior_id").references(() => behavior.behaviorId),
  accelerate: integer().default(60).notNull(),
  ...housekeeping,
}, (table) => [
  index("idx_surveilr_osquery_ms_node__node_key").on(table.nodeKey),
  unique().on(table.hostIdentifier, table.osVersion),
  unique().on(table.nodeKey),
]);


export const urIngestSessionOsqueryMsLog = table(
  "ur_ingest_session_osquery_ms_log",
  {
    urIngestSessionOsqueryMsLogId: text("ur_ingest_session_osquery_ms_log_id")
      .primaryKey().notNull(),
    nodeKey: text("node_key").notNull().references(() =>
      surveilrOsqueryMsNode.nodeKey
    ),
    logType: text("log_type").notNull(),
    logData: text("log_data").notNull(),
    appliedJqFilters: text("applied_jq_filters"),
    ...housekeeping,
  },
  (table) => [
    unique().on(table.nodeKey, table.logType, table.logData),
  ],
);


export const osqueryPolicy = table("osquery_policy", {
  osqueryPolicyId: text("osquery_policy_id").primaryKey().notNull(),
  policyGroup: text("policy_group"),
  policyName: text("policy_name").notNull(),
  osqueryCode: text("osquery_code").notNull(),
  policyDescription: text("policy_description").notNull(),
  policyPassLabel: text("policy_pass_label").default("Pass").notNull(),
  policyFailLabel: text("policy_fail_label").default("Fail").notNull(),
  policyPassRemarks: text("policy_pass_remarks"),
  policyFailRemarks: text("policy_fail_remarks"),
  osqueryPlatforms: text("osquery_platforms"),
  ...housekeeping,
}, (table) => [
  unique().on(table.policyName, table.osqueryCode),
]);

export const surveilrOsqueryMsDistributedQuery = table(
  "surveilr_osquery_ms_distributed_query",
  {
    queryId: text("query_id").primaryKey().notNull(),
    nodeKey: text("node_key").notNull().references(() =>
      surveilrOsqueryMsNode.nodeKey
    ),
    queryName: text("query_name").notNull(),
    querySql: text("query_sql").notNull(),
    discoveryQuery: text("discovery_query"),
    status: text().notNull(),
    elaboration: text(),
    interval: integer().notNull(),
    ...housekeeping,
  },
  (table) => [],
);


export const surveilrOsqueryMsDistributedResult = table(
  "surveilr_osquery_ms_distributed_result",
  {
    surveilrOsqueryMsDistributedResultId: text(
      "surveilr_osquery_ms_distributed_result_id",
    ).primaryKey().notNull(),
    queryId: text("query_id").notNull().references(() =>
      surveilrOsqueryMsDistributedQuery.queryId
    ),
    nodeKey: text("node_key").notNull().references(() =>
      surveilrOsqueryMsNode.nodeKey
    ),
    results: text().notNull(),
    statusCode: integer("status_code").notNull(),
    ...housekeeping,
  },
  (table) => [],
);


export const surveilrOsqueryMsCarve = table("surveilr_osquery_ms_carve", {
  surveilrOsqueryMsCarveId: text("surveilr_osquery_ms_carve_id").primaryKey()
    .notNull(),
  nodeKey: text("node_key").notNull().references(() =>
    surveilrOsqueryMsNode.nodeKey
  ),
  sessionId: text("session_id").notNull(),
  carveGuid: text("carve_guid").notNull(),
  carveSize: integer("carve_size").notNull(),
  blockCount: integer("block_count").notNull(),
  blockSize: integer("block_size").notNull(),
  receivedBlocks: integer("received_blocks").default(0).notNull(),
  carvePath: text("carve_path"),
  status: text().notNull(),
  startTime: numeric("start_time").notNull(),
  completionTime: numeric("completion_time"),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  unique().on(table.sessionId),
  unique().on(table.carveGuid),
]);


export const surveilrOsqueryMsCarvedExtractedFile = table(
  "surveilr_osquery_ms_carved_extracted_file",
  {
    surveilrOsqueryMsCarvedExtractedFileId: text(
      "surveilr_osquery_ms_carved_extracted_file_id",
    ).primaryKey().notNull(),
    carveGuid: text("carve_guid").notNull().references(() =>
      surveilrOsqueryMsCarve.carveGuid
    ),
    path: text().notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    contentDigest: text("content_digest").notNull(),
    nature: text(),
    extractedAt: timestamptz("extracted_at").notNull(),
    ...housekeeping,
  },
  (table) => [
    index("idx_surveilr_osquery_ms_carved_extracted_file__path__carve_guid").on(
      table.path,
      table.carveGuid,
    ),
  ],
);


export const surveilrSnmpDevice = table("surveilr_snmp_device", {
  surveilrSnmpDeviceId: text("surveilr_snmp_device_id").primaryKey().notNull(),
  deviceKey: text("device_key").notNull(),
  snmpHost: text("snmp_host").notNull(),
  snmpPort: integer("snmp_port").default(161).notNull(),
  snmpCommunity: text("snmp_community").notNull(),
  snmpVersion: text("snmp_version").default("2c").notNull(),
  snmpTimeout: integer("snmp_timeout").default(5).notNull(),
  snmpRetries: integer("snmp_retries").default(3).notNull(),
  deviceType: text("device_type"),
  deviceDescription: text("device_description"),
  lastSeen: numeric("last_seen").notNull(),
  status: text().default("active").notNull(),
  deviceId: text("device_id").notNull().references(() => device.deviceId),
  behaviorId: text("behavior_id").references(() => behavior.behaviorId),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_surveilr_snmp_device__device_key").on(table.deviceKey),
  unique().on(table.snmpHost, table.snmpPort),
  unique().on(table.deviceKey),
  checkJSON(table.elaboration),
]);


export const surveilrSnmpCollection = table("surveilr_snmp_collection", {
  surveilrSnmpCollectionId: text("surveilr_snmp_collection_id").primaryKey().notNull(),
  deviceKey: text("device_key").notNull().references(() =>
    surveilrSnmpDevice.deviceKey
  ),
  oid: text().notNull(),
  oidValue: text("oid_value").notNull(),
  oidType: text("oid_type").notNull(),
  collectedAt: timestamptz("collected_at").notNull(),
  elaboration: text(),
  ...housekeeping,
}, (table) => [
  index("idx_surveilr_snmp_collection__device_key__oid").on(
    table.deviceKey,
    table.oid,
  ),
  index("idx_surveilr_snmp_collection__collected_at").on(table.collectedAt),
  checkJSON(table.elaboration),
]);


export const surveilrFunctionDoc = table("surveilr_function_doc", {
  name: text().primaryKey(),
  description: text(),
  parameters: text({ mode: "json" }),
  returnType: text("return_type"),
  version: text(),
}, (table) => [
  checkJSON(table.parameters),
]);

// Export all views from views.ts (temporarily commented out due to circular dependency)
// export * from "./views.ts";
// Views are imported separately in drizzle-to-sql.ts to avoid circular dependency
