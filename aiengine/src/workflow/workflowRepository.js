import { query, getConnection } from '../../db.js';

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapWorkflowRow(row, events = []) {
  if (!row) return null;

  return {
    id: row.id,
    supplierId: row.supplier_id,
    productId: row.product_id,
    channel: row.channel,
    createdBy: row.created_by,
    state: row.state,
    status: row.status,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    history: events,
    appliedEventIds: events.map((event) => event.id),
  };
}

function mapEventRow(row) {
  return {
    id: row.event_id,
    workflowId: row.workflow_id,
    type: row.event_type,
    actor: row.actor ? { id: row.actor } : {},
    payload: parseJson(row.payload, {}),
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function stringifyActor(actor) {
  if (actor == null) return null;
  if (typeof actor === 'string') return actor;
  if (typeof actor === 'object') {
    return actor.id ?? actor.type ?? JSON.stringify(actor);
  }
  return String(actor);
}

export async function createWorkflowRecord(workflow) {
  await query(
    `
      INSERT INTO workflows (
        id, supplier_id, product_id, channel, created_by, state, status, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      workflow.id,
      workflow.supplierId,
      workflow.productId ?? null,
      workflow.channel ?? null,
      workflow.createdBy ?? null,
      workflow.state,
      workflow.status,
      JSON.stringify(workflow.metadata ?? {}),
      workflow.createdAt,
      workflow.updatedAt,
    ]
  );

  return workflow;
}

export async function getWorkflowRecordById(workflowId) {
  const workflowRows = await query(
    `
      SELECT id, supplier_id, product_id, channel, created_by, state, status, metadata, created_at, updated_at
      FROM workflows
      WHERE id = ?
      LIMIT 1
    `,
    [workflowId]
  );

  if (!workflowRows.length) {
    return null;
  }

  const eventRows = await query(
    `
      SELECT event_id, workflow_id, event_type, actor, payload, created_at
      FROM workflow_events
      WHERE workflow_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [workflowId]
  );

  const events = eventRows.map(mapEventRow);
  return mapWorkflowRow(workflowRows[0], events);
}

export async function saveWorkflowWithEvent(workflow, event) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        UPDATE workflows
        SET state = ?, status = ?, metadata = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        workflow.state,
        workflow.status,
        JSON.stringify(workflow.metadata ?? {}),
        workflow.updatedAt,
        workflow.id,
      ]
    );

    await connection.execute(
      `
        INSERT INTO workflow_events (
          workflow_id, event_id, event_type, from_state, to_state, actor, notes, payload, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        workflow.id,
        event.id,
        event.type,
        null,
        workflow.state,
        stringifyActor(event.actor),
        null,
        JSON.stringify(event.payload ?? {}),
        event.timestamp,
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getWorkflowRecordById(workflow.id);
}