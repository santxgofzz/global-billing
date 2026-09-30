# Intuitive Connected Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Global Billing en una aplicación intuitiva y conectada donde los administradores completen clientes, contratos, cobros, pagos, gastos, provisiones y tesorería sin copiar UUID ni crear registros financieros relacionados por separado.

**Architecture:** El backend Django continúa como fuente de verdad y añade endpoints de casos de uso transaccionales sobre los modelos y servicios existentes. El frontend Next.js reemplaza el formulario CRUD genérico por componentes de formulario accesibles y asistentes específicos; los listados consumen read models con etiquetas humanas y catálogos livianos. La entrega se mantiene en una sola rama, pero cada tarea deja un incremento comprobable y un commit independiente.

**Tech Stack:** Python 3.12, Django, Django REST Framework, PostgreSQL, Celery/Redis, Next.js 16.3, React 19, TypeScript estricto, TanStack Query 5, Vitest/Testing Library y Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-intuitive-connected-workflows-design.md`

## Global Constraints

- Valores monetarios: enteros COP; nunca `float` ni cálculo financiero autoritativo en el navegador.
- Fechas y horas: timezone-aware en `America/Bogota`; presentación `es-CO`.
- Operaciones financieras compuestas: `transaction.atomic`, auditoría y rollback completo ante cualquier error.
- No pedir ni mostrar UUID al usuario; las API conservan UUID como identificadores internos.
- Registros financieros confirmados: anular/cancelar/archivar, nunca eliminar físicamente.
- No retirar todavía los endpoints CRUD existentes; los nuevos endpoints de caso de uso conviven durante la migración.
- Diseño propio Global Automate con `#522e88`, modos oscuro/claro, fallback glass y `prefers-reduced-motion`.
- Paginación inicial de listados: 20 registros; los catálogos usan respuestas livianas sin paginar colecciones grandes.
- Formularios: etiquetas reales, ayuda, ejemplo, error por campo, `aria-describedby` y bloqueo durante envío.
- Cada tarea comienza con una prueba que falla, termina con pruebas verdes y un commit descriptivo en inglés.

## Review Focus

- Dos envíos simultáneos del mismo asistente no pueden duplicar pago, transacción, gasto ni contrato; Task 1 define idempotencia y Tasks 4, 6 y 7 la aplican.
- Un selector dependiente debe limpiar una selección que dejó de pertenecer al cliente padre; Task 2 lo prueba en frontend y Task 1 rechaza combinaciones inválidas en backend.
- Un monto COP con separadores, pegado o vacío debe convertirse sin decimales ni `NaN`; Task 2 cubre esos casos.
- Una falla al almacenar un comprobante o documento debe revertir toda la operación compuesta; Task 6, Task 7 y Task 8 lo prueban.
- Las alertas ejecutadas varias veces el mismo día deben conservar un solo evento accionable por usuario y umbral; Task 9 prueba 7/3/1/vencido.

---

## File Structure

### Backend

- `backend/apps/reporting/lookups.py`: catálogo central de recursos filtrables con `id`, `label` y `description`.
- `backend/apps/reporting/read_serializers.py`: representaciones de lectura con nombres de relaciones y resúmenes.
- `backend/apps/reporting/use_case_serializers.py`: validación explícita de payloads compuestos.
- `backend/apps/reporting/use_case_views.py`: endpoints orientados a onboarding, contratos, pagos y gastos.
- `backend/apps/clients/services.py`: creación atómica de cliente y perfil de cobro.
- `backend/apps/contracts/services.py`: vista previa y configuración atómica de contrato.
- `backend/apps/payments/services.py`: registro atómico completo e idempotente de pagos.
- `backend/apps/expenses/services.py`: registro atómico completo e idempotente de gastos.
- `backend/apps/documents/services.py`: carga y versionado seguro de documentos.
- `backend/apps/notifications/services.py`: construcción determinista de eventos financieros.
- `backend/apps/reporting/client_summary.py`: métricas y conteos de la ficha de cliente.
- `backend/apps/common/idempotency.py`: ejecución única y recuperación de respuesta para mutaciones compuestas reintentadas.
- `backend/apps/reporting/settings.py`: lectura y actualización allowlisted de configuración no sensible.

### Frontend

- `frontend/components/forms/*`: campos compartidos, selectores, entradas COP, secciones y errores.
- `frontend/components/wizard/*`: shell de pasos, navegación y resumen de impacto.
- `frontend/components/workflows/*`: un flujo específico por cliente, proyecto, contrato, pago, gasto, provisión y documento.
- `frontend/components/settings/*`: administración funcional de catálogos.
- `frontend/lib/api.ts`: error estructurado, multipart y utilidades de sesión.
- `frontend/lib/lookups.ts`: hooks y tipos de catálogos.
- `frontend/lib/query-keys.ts`: claves e invalidaciones específicas.
- `frontend/lib/workflow-contracts.ts`: tipos de request/response compartidos por asistentes.
- `frontend/tests/*`: pruebas unitarias/integración de formularios y navegación.
- `frontend/tests/e2e/intuitive-workflows.spec.ts`: recorridos críticos autenticados.

## Task 1: Read models, lookup API and validation foundation

**Files:**
- Create: `backend/apps/reporting/lookups.py`
- Create: `backend/apps/reporting/read_serializers.py`
- Create: `backend/apps/reporting/use_case_serializers.py`
- Create: `backend/apps/common/idempotency.py`
- Create: `backend/apps/common/migrations/0001_idempotentoperation.py`
- Modify: `backend/apps/common/models.py`
- Modify: `backend/apps/reporting/urls.py`
- Modify: `backend/apps/reporting/views.py`
- Modify: `backend/apps/common/exceptions.py`
- Test: `backend/tests/test_lookups_and_read_models.py`
- Test: `backend/tests/test_idempotency.py`

**Interfaces:**
- Produces: `LookupOption(id: UUID, label: str, description: str)` through `GET /api/v1/lookups/<resource>/`.
- Produces: `FieldErrorResponse = {"detail": str, "fields": dict[str, list[str]]}` for invalid writes.
- Produces: `execute_idempotent(*, user, scope: str, key: UUID, payload: dict, operation: Callable[[], dict]) -> dict`, backed by a unique `(user, scope, key)` operation record and SHA-256 request hash.
- Resources: `clients`, `projects`, `contracts`, `services`, `bank-accounts`, `expense-categories`, `billing-issuers`, `funds`, `periods`, `installments`, `expenses`.

- [ ] **Step 1: Write failing lookup, relationship and idempotency tests**

  Add tests named `test_lookup_excludes_inactive_clients`, `test_project_lookup_filters_by_client`, `test_installment_lookup_returns_balance_context`, `test_read_serializer_uses_related_names`, and `test_lookup_rejects_project_from_another_client`. In `test_idempotency.py`, assert the same key/payload returns the stored response without running twice, while the same key with a different request hash returns HTTP 409 semantics.

  ```python
  def test_project_lookup_filters_by_client(admin_client, client_a, project_a, project_b):
      response = admin_client.get(f"/api/v1/lookups/projects/?client={client_a.id}")
      assert response.status_code == 200
      assert [row["id"] for row in response.json()] == [str(project_a.id)]
  ```

- [ ] **Step 2: Run tests and verify failure**

  Run: `cd backend && pytest tests/test_lookups_and_read_models.py tests/test_idempotency.py -q`
  Expected: FAIL because `/api/v1/lookups/.../` and read serializers do not exist.

- [ ] **Step 3: Implement idempotent operation storage**

  Add `IdempotentOperation(user, scope, key, request_hash, response_data, completed_at)` with a database uniqueness constraint, then implement `execute_idempotent`.

- [ ] **Step 4: Implement lookup registry and readable serializers**

  Implement `get_lookup_queryset(resource: str, filters: QueryDict, user: User) -> QuerySet` and `serialize_lookup(resource: str, instance: Model) -> dict[str, str]`. Add `select_related` for visible relations and explicit field validation for parent-child filters.

- [ ] **Step 5: Normalize DRF errors without discarding field detail**

  Extend `spanish_exception_handler` to preserve serializer field paths under `fields` and return a human `detail`; do not convert authentication failures or server errors into status 200.

- [ ] **Step 6: Run backend checks**

  Run: `cd backend && pytest tests/test_lookups_and_read_models.py tests/test_idempotency.py -q && python manage.py check`
  Expected: all tests PASS and system check reports no issues.

- [ ] **Step 7: Commit**

  Run: `git add backend && git commit -m "feat(api): add readable lookups and idempotent operations"`

## Task 2: Accessible form system and query behavior

**Files:**
- Create: `frontend/components/forms/form-field.tsx`
- Create: `frontend/components/forms/entity-select.tsx`
- Create: `frontend/components/forms/money-input.tsx`
- Create: `frontend/components/forms/percentage-input.tsx`
- Create: `frontend/components/forms/form-section.tsx`
- Create: `frontend/components/forms/inline-create.tsx`
- Create: `frontend/components/wizard/wizard.tsx`
- Create: `frontend/components/wizard/impact-summary.tsx`
- Create: `frontend/lib/lookups.ts`
- Create: `frontend/lib/query-keys.ts`
- Create: `frontend/lib/workflow-contracts.ts`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/components/providers.tsx`
- Modify: `frontend/components/ui.tsx`
- Test: `frontend/tests/form-system.test.tsx`
- Test: `frontend/tests/api.test.ts`

**Interfaces:**
- Consumes: Task 1 lookup response and `FieldErrorResponse`.
- Produces: `<EntitySelect resource parentFilters value onChange />`, `<MoneyInput value:number|null onValueChange />`, `<Wizard steps currentStep />`, `parseCOP(input: string) -> number | null`, `ApiError.fields`.

- [ ] **Step 1: Write failing component and parsing tests**

  Test accessible help/error wiring, keyboard selection, stale child value clearing, values `"1.250.000" -> 1250000`, pasted `"$ 275.000" -> 275000`, empty input -> `null`, and rejection of decimal/negative COP where disallowed.

  ```ts
  expect(parseCOP("1.250.000")).toBe(1_250_000);
  expect(parseCOP("$ 275.000")).toBe(275_000);
  expect(parseCOP("")).toBeNull();
  ```

- [ ] **Step 2: Run tests and verify failure**

  Run: `cd frontend && npm test -- --run tests/form-system.test.tsx tests/api.test.ts`
  Expected: FAIL because shared components and structured errors do not exist.

- [ ] **Step 3: Implement the form primitives and API error type**

  Add `ApiError extends Error { status: number; fields: Record<string,string[]> }`, `apiFetch`, and `apiUpload`; keep CSRF/session cookies and human network errors. Entity selectors must query only when required parent filters are present.

- [ ] **Step 4: Tune QueryClient defaults**

  Set stable catalogs to five-minute `staleTime`, transactional data to 30 seconds, `retry: 1`, and `refetchOnWindowFocus: false`; mutations invalidate only keys declared in `query-keys.ts`.

- [ ] **Step 5: Run frontend checks**

  Run: `cd frontend && npm test -- --run tests/form-system.test.tsx tests/api.test.ts && npm run typecheck && npm run lint`
  Expected: PASS with no TypeScript or ESLint errors.

- [ ] **Step 6: Commit**

  Run: `git add frontend && git commit -m "feat(ui): add accessible financial form system"`

## Task 3: Client onboarding, projects and real catalog settings

**Files:**
- Create: `backend/apps/clients/services.py`
- Create: `backend/tests/test_client_onboarding.py`
- Create: `frontend/components/workflows/client-form.tsx`
- Create: `frontend/components/workflows/project-form.tsx`
- Create: `frontend/components/settings/catalog-settings.tsx`
- Create: `frontend/components/settings/settings-page.tsx`
- Create: `frontend/components/settings/application-settings.tsx`
- Create: `frontend/components/settings/distribution-settings.tsx`
- Create: `backend/apps/reporting/settings.py`
- Create: `backend/tests/test_settings_api.py`
- Modify: `backend/apps/reporting/use_case_serializers.py`
- Modify: `backend/apps/reporting/use_case_views.py`
- Modify: `backend/apps/reporting/urls.py`
- Modify: `frontend/components/module-page.tsx`
- Modify: `frontend/components/detail-pages.tsx`
- Test: `frontend/tests/client-project-flows.test.tsx`
- Test: `frontend/tests/settings-page.test.tsx`

**Interfaces:**
- Produces: `POST /api/v1/clients/onboard/` with `{client, billing_profile, next_actions}`.
- Produces: `ClientForm({initialValues?, onCreated})` and `ProjectForm({clientId?, onCreated})`.
- Produces: `GET/PATCH /api/v1/settings/<section>/` for allowlisted `general`, `brand`, `notifications`, `documents`, `backups`, `security` and `system` values; secret values are never returned.

- [ ] **Step 1: Write failing onboarding and settings API tests**

  Assert suggested prefix normalization (`"Humanos Reháb" -> "HUMANOS-REHAB"`), explicit duplicate-prefix error, client/profile rollback when profile is invalid, audit creation, project rejection when a selected service is inactive, settings allowlist, secret masking, admin permissions and protection of the last active administrator.

  ```python
  def test_invalid_profile_rolls_back_client(admin_client, invalid_onboarding_payload):
      response = admin_client.post("/api/v1/clients/onboard/", invalid_onboarding_payload)
      assert response.status_code == 400
      assert Client.objects.count() == 0
  ```

- [ ] **Step 2: Run backend test and verify failure**

  Run: `cd backend && pytest tests/test_client_onboarding.py tests/test_settings_api.py -q`
  Expected: FAIL because onboarding and allowlisted settings endpoints are absent.

- [ ] **Step 3: Implement onboarding service and endpoint**

  Implement `onboard_client(*, client_data: dict, billing_profile_data: dict, user: User) -> tuple[Client, ClientBillingProfile]` under `transaction.atomic`; generate a suggestion but require the submitted code to pass uniqueness validation.

- [ ] **Step 4: Implement allowlisted settings and internal-user endpoints**

  Map each section to explicit serializer fields, omit secret values from reads, audit updates, expose distribution policies through their existing models, and reject deactivation of the last active administrator.

- [ ] **Step 5: Write failing frontend flow and settings tests**

  Assert labels `Cliente`, `Código para numerar cuentas de cobro`, visible examples, preselected client from detail route, service selection by name, and post-save actions `Crear proyecto`, `Crear contrato`, `Ir al cliente`.

- [ ] **Step 6: Run frontend tests and verify failure**

  Run: `cd frontend && npm test -- --run tests/client-project-flows.test.tsx tests/settings-page.test.tsx`
  Expected: FAIL because the explicit flows and active settings sections do not exist.

- [ ] **Step 7: Replace generic client/project forms and activate settings catalogs**

  Route `clients`, `projects`, `services`, `billing-issuers`, `bank-accounts`, `expense-categories`, and `funds` to their explicit forms. Settings cards must open working list/create/edit surfaces for those catalogs, policy participants, allowlisted application settings and internal users. Test that secrets are masked, only admins can update, and an admin cannot deactivate the last active administrator.

- [ ] **Step 8: Verify and commit**

  Run: `cd backend && pytest tests/test_client_onboarding.py tests/test_settings_api.py -q`; then `cd ../frontend && npm test -- --run tests/client-project-flows.test.tsx tests/settings-page.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "feat(clients): add guided onboarding and connected projects"`

## Task 4: Transactional contract setup and schedule preview

**Files:**
- Create: `backend/apps/contracts/services.py`
- Create: `backend/tests/test_contract_setup.py`
- Create: `frontend/components/workflows/contract-wizard.tsx`
- Create: `frontend/components/workflows/schedule-preview.tsx`
- Modify: `backend/apps/billing/services.py`
- Modify: `backend/apps/reporting/use_case_serializers.py`
- Modify: `backend/apps/reporting/use_case_views.py`
- Modify: `backend/apps/reporting/urls.py`
- Modify: `frontend/components/module-page.tsx`
- Modify: `frontend/components/detail-pages.tsx`
- Test: `frontend/tests/contract-wizard.test.tsx`

**Interfaces:**
- Produces: `preview_contract_schedule(payload: ContractSetupInput) -> ContractSchedulePreview` without persistence.
- Produces: `setup_contract(*, payload, user) -> ContractSetupResult` containing contract, version, services, rule and created obligation count.
- Endpoint: `POST /api/v1/contracts/setup/` with `preview: boolean`.
- Mutating setup requests require `Idempotency-Key` and use Task 1 `execute_idempotent` with scope `contract.setup`; preview requests do not persist an operation record.

- [ ] **Step 1: Write failing domain/API tests**

  Cover monthly, quarterly, unique, 11/26 at 50/50, manual dates, percentage sum not 100, project/client mismatch, preview row count, preview leaves database unchanged, and transaction rollback if schedule creation fails.
  Also assert that two identical `contract.setup` requests with the same idempotency key create one contract and return the same response.

  ```python
  def test_split_monthly_preview_is_one_obligation(contract_setup_payload):
      preview = preview_contract_schedule(contract_setup_payload | {"amount": 550_000})
      assert preview[0].amount == 550_000
      assert [row.amount for row in preview[0].installments] == [275_000, 275_000]
  ```

- [ ] **Step 2: Run test and verify failure**

  Run: `cd backend && pytest tests/test_contract_setup.py -q`
  Expected: FAIL because setup/preview service is absent.

- [ ] **Step 3: Implement preview and setup services**

  Reuse schedule arithmetic from `apps.billing.services`; extract a pure `build_schedule_preview(...)` so preview and persistence share the exact split logic. Preserve the invariant `$550.000 = $275.000 + $275.000`.

- [ ] **Step 4: Write failing contract wizard tests**

  Assert client/project dependency, services by name, conditional rule fields, 100% validation, schedule table, back/next navigation, impact summary, and one final request only after confirmation.

- [ ] **Step 5: Run frontend test and verify failure**

  Run: `cd frontend && npm test -- --run tests/contract-wizard.test.tsx`
  Expected: FAIL because the five-step wizard does not exist.

- [ ] **Step 6: Implement the five-step contract wizard**

  Compose Task 2 `Wizard`, dependent selectors and schedule preview; send no mutation until the final confirmation and include a generated `Idempotency-Key`.

- [ ] **Step 7: Verify and commit**

  Run: `cd backend && pytest tests/test_contract_setup.py tests/test_financial_flows.py -q`; then `cd ../frontend && npm test -- --run tests/contract-wizard.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "feat(contracts): add transactional setup wizard and schedule preview"`

## Task 5: Billing actions, charge documents and message variants

**Files:**
- Create: `frontend/components/workflows/billing-actions.tsx`
- Create: `frontend/components/workflows/charge-document-drawer.tsx`
- Modify: `backend/apps/reporting/read_serializers.py`
- Modify: `backend/apps/reporting/views.py`
- Modify: `backend/apps/billing/services.py`
- Modify: `frontend/components/module-page.tsx`
- Modify: `frontend/components/detail-pages.tsx`
- Test: `backend/tests/test_billing_actions.py`
- Test: `frontend/tests/billing-actions.test.tsx`

**Interfaces:**
- Consumes: existing `POST /installments/{id}/generate_document/` and `/waive/`, now with explicit input serializers.
- Produces: installment read model with `client_name`, `contract_name`, `period_label`, `paid_amount`, `waived_amount`, `balance`, `status`, `current_document`.
- Produces: `POST /charge-documents/{id}/messages/regenerate/` and `PATCH /generated-messages/{id}/`.

- [ ] **Step 1: Write failing billing action tests**

  Assert default issuer selection, consecutive preview, duplicate job idempotency, stale draft revision, waiver without bank movement, message variant regeneration, edited message persistence and field-level validation.

  ```python
  def test_waiver_does_not_create_bank_transaction(admin_client, installment):
      response = admin_client.post(f"/api/v1/installments/{installment.id}/waive/", {"amount": 275_000, "reason": "Apoyo extraordinario"})
      assert response.status_code == 201
      assert BankTransaction.objects.count() == 0
  ```

- [ ] **Step 2: Run backend tests and verify failure**

  Run: `cd backend && pytest tests/test_billing_actions.py -q`
  Expected: FAIL because explicit billing serializers, regeneration and the read model are absent.

- [ ] **Step 3: Implement explicit billing serializers and read model**

  Keep `generate_charge_document` and `grant_waiver` as domain entry points; add deterministic variant selection that avoids immediately repeating the last `variant_key`.

- [ ] **Step 4: Write and run failing frontend billing tests**

  Run: `cd frontend && npm test -- --run tests/billing-actions.test.tsx`
  Expected: FAIL after asserting the four contextual actions, human labels and document/message drawer.

- [ ] **Step 5: Build contextual billing UI**

  Group installments by client/period, add actions `Preparar cuenta de cobro`, `Registrar pago`, `Condonar`, and display all monetary components without UUID.

- [ ] **Step 6: Verify and commit**

  Run: `cd backend && pytest tests/test_billing_actions.py tests/test_financial_flows.py -q`; then `cd ../frontend && npm test -- --run tests/billing-actions.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "feat(billing): connect installments documents messages and waivers"`

## Task 6: Atomic payment registration

**Files:**
- Modify: `backend/apps/payments/services.py`
- Modify: `backend/apps/reporting/use_case_serializers.py`
- Modify: `backend/apps/reporting/use_case_views.py`
- Modify: `backend/apps/reporting/urls.py`
- Create: `backend/tests/test_payment_registration.py`
- Create: `frontend/components/workflows/payment-wizard.tsx`
- Modify: `frontend/components/module-page.tsx`
- Modify: `frontend/components/workflows/billing-actions.tsx`
- Test: `frontend/tests/payment-wizard.test.tsx`

**Interfaces:**
- Produces: `register_payment(*, payload: PaymentRegistration, proof, user, idempotency_key: UUID) -> PaymentRegistrationResult` through Task 1 `execute_idempotent` with scope `payment.register`.
- Endpoint: multipart `POST /api/v1/payments/register/` returning payment, transaction, allocations and `{received, applied, unapplied}`.

- [ ] **Step 1: Write failing payment service tests**

  Cover full, partial, one payment across three months, unallocated advance, allocation over payment, allocation over installment balance, wrong-client installment, duplicate idempotency key, proof storage failure rollback, and audit payload.

  ```python
  def test_partial_payment_keeps_remaining_balance(register_payment_payload, installment):
      result = register_payment(**register_payment_payload(amount=300_000, installment=installment))
      installment.refresh_from_db()
      assert result.applied == 300_000
      assert installment.balance == 200_000
  ```

- [ ] **Step 2: Run test and verify failure**

  Run: `cd backend && pytest tests/test_payment_registration.py -q`
  Expected: FAIL because registration endpoint is absent.

- [ ] **Step 3: Implement atomic registration**

  Lock payment-relevant installments using `select_for_update`; create payment, bank transaction and allocations inside one transaction. Return the stored Task 1 operation response when the same key and payload are retried.

- [ ] **Step 4: Write and run failing payment wizard tests**

  Assert client/account labels, pending installments ordered oldest first, editable oldest-debt suggestion, multipart proof, applied/unapplied summary, no duplicate submit, and errors attached to allocation rows. Run `cd frontend && npm test -- --run tests/payment-wizard.test.tsx`; expect FAIL because the wizard does not exist.

- [ ] **Step 5: Build the four-step payment wizard**

  Compose Task 2 fields and wizard, generate one UUID idempotency key per submission attempt, preserve it for network retries, and replace it only after a terminal response.

- [ ] **Step 6: Verify and commit**

  Run: `cd backend && pytest tests/test_payment_registration.py tests/test_financial_flows.py -q`; then `cd ../frontend && npm test -- --run tests/payment-wizard.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "feat(payments): add atomic guided payment registration"`

## Task 7: Atomic expense registration and allocation preview

**Files:**
- Modify: `backend/apps/expenses/services.py`
- Modify: `backend/apps/reporting/use_case_serializers.py`
- Modify: `backend/apps/reporting/use_case_views.py`
- Modify: `backend/apps/reporting/urls.py`
- Create: `backend/tests/test_expense_registration.py`
- Create: `frontend/components/workflows/expense-wizard.tsx`
- Create: `frontend/components/workflows/allocation-editor.tsx`
- Modify: `frontend/components/module-page.tsx`
- Test: `frontend/tests/expense-wizard.test.tsx`

**Interfaces:**
- Produces: `preview_expense_allocation(payload) -> {lines, total, difference, snapshot}`.
- Produces: `register_expense(*, payload, receipt, user, idempotency_key: UUID) -> ExpenseRegistrationResult` through Task 1 `execute_idempotent` with scope `expense.register`.
- Endpoints: `POST /api/v1/expenses/allocation-preview/` and multipart `POST /api/v1/expenses/register/`.

- [ ] **Step 1: Write failing expense tests**

  Cover Global, one client, equal, percentage, amount, received-revenue snapshot, exact-sum requirement, client/project mismatch, paid expense bank movement, unpaid expense without movement, duplicate idempotency key and receipt failure rollback.

  ```python
  def test_shared_expense_requires_exact_allocation_total(shared_payload):
      response = register_expense(**shared_payload(amount=150_000, lines=[70_000, 70_000]))
      assert response.fields["allocations"] == ["La distribución debe sumar exactamente $150.000."]
  ```

- [ ] **Step 2: Run backend tests and verify failure**

  Run: `cd backend && pytest tests/test_expense_registration.py -q`
  Expected: FAIL because allocation preview and atomic registration do not exist.

- [ ] **Step 3: Implement preview and registration services**

  Reuse `confirm_allocations`; calculate preview from a declared period, store its source totals in `calculation_snapshot`, and never silently recalculate a confirmed allocation.

- [ ] **Step 4: Write and run failing expense wizard tests**

  Assert the first conceptual decision, conditional relations, inline category creation, exact allocation difference and explicit snapshot confirmation. Run `cd frontend && npm test -- --run tests/expense-wizard.test.tsx`; expect FAIL.

- [ ] **Step 5: Build the conditional expense wizard**

  The first step asks `¿A quién pertenece este gasto?`; render only relevant relations, permit inline category creation, show allocation difference live, and require explicit confirmation of the snapshot.

- [ ] **Step 6: Verify and commit**

  Run: `cd backend && pytest tests/test_expense_registration.py tests/test_expense_allocations.py -q`; then `cd ../frontend && npm test -- --run tests/expense-wizard.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "feat(expenses): add guided registration and allocation snapshots"`

## Task 8: Provisions, funds, treasury and document flows

**Files:**
- Create: `backend/apps/documents/services.py`
- Modify: `backend/apps/reporting/serializers.py`
- Modify: `backend/apps/reporting/views.py`
- Modify: `backend/apps/provisions/services.py`
- Modify: `backend/apps/treasury/services.py`
- Create: `backend/tests/test_connected_operations.py`
- Create: `frontend/components/workflows/provision-form.tsx`
- Create: `frontend/components/workflows/provision-actions.tsx`
- Create: `frontend/components/workflows/fund-movement-form.tsx`
- Create: `frontend/components/workflows/transfer-form.tsx`
- Create: `frontend/components/workflows/document-form.tsx`
- Create: `frontend/components/workflows/note-form.tsx`
- Modify: `frontend/components/module-page.tsx`
- Modify: `frontend/components/detail-pages.tsx`
- Test: `frontend/tests/connected-operations.test.tsx`

**Interfaces:**
- Produces: `create_document_version(*, document, file, user, notes) -> DocumentVersion`.
- Produces: provision calculation response with current cost, projected target, periods, suggested amount and surplus policy.
- Consumes: lookup API for accounts, funds, clients, projects, categories and eligible expenses.

- [ ] **Step 1: Write failing domain/API tests**

  Cover increase calculation, delayed contribution start, extraordinary contribution recalculation, consumption deficit/surplus, next-cycle confirmation, fund movement not becoming expense, transfer net zero and different accounts, document v1/v2, unsafe file rejection, file-save rollback and internal note creation linked to client/project/contract with the authenticated author.

  ```python
  def test_internal_transfer_has_zero_net_effect(executed_transfer):
      amounts = [executed_transfer.out_transaction.amount, executed_transfer.in_transaction.amount]
      assert sorted(amounts) == [-200_000, 200_000]
      assert sum(amounts) == 0
  ```

- [ ] **Step 2: Run backend tests and verify failure**

  Run: `cd backend && pytest tests/test_connected_operations.py -q`
  Expected: FAIL because the explicit compound actions and document version service are absent.

- [ ] **Step 3: Implement explicit action serializers and document service**

  Preserve existing domain services, add clear inputs/outputs, validate relational ownership, and create document plus v1 atomically. Later uploads increment version under a row lock.

- [ ] **Step 4: Write and run failing connected-form tests**

  Assert the everyday labels, previews, name-based account/fund selection and mobile full-page layout. Run `cd frontend && npm test -- --run tests/connected-operations.test.tsx`; expect FAIL.

- [ ] **Step 5: Build connected forms**

  Use everyday labels from the spec, previews before provision/transfer confirmation, account and fund names instead of IDs, and mobile full-page layout for complex actions.

- [ ] **Step 6: Verify and commit**

  Run: `cd backend && pytest tests/test_connected_operations.py tests/test_import_and_documents.py tests/test_treasury_close_and_auth.py -q`; then `cd ../frontend && npm test -- --run tests/connected-operations.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "feat(operations): connect provisions funds treasury and documents"`

## Task 9: Actionable notifications and attention center

**Files:**
- Create: `backend/apps/notifications/services.py`
- Modify: `backend/apps/notifications/tasks.py`
- Modify: `backend/apps/notifications/models.py`
- Create: `backend/apps/notifications/migrations/0002_notification_kind_and_date.py`
- Modify: `backend/apps/reporting/views.py`
- Create: `backend/tests/test_actionable_notifications.py`
- Create: `frontend/components/notification-center.tsx`
- Modify: `frontend/components/app-shell.tsx`
- Modify: `frontend/components/dashboard.tsx`
- Test: `frontend/tests/notification-center.test.tsx`

**Interfaces:**
- Produces: `build_financial_events(on_date: date) -> list[FinancialNotificationEvent]`.
- Produces: `POST /api/v1/notifications/{id}/read/`, `POST /api/v1/notifications/read-all/`, and dashboard `attentionItems` sorted by severity/due date.

- [ ] **Step 1: Write failing idempotency and threshold tests**

  Assert one event per user/object/threshold for 7, 3, 1 and overdue; no daily overdue duplicates; document-review, contract-30-day and underfunded-provision events; exact `action_url`; read-one and read-all permissions.

  ```python
  def test_overdue_job_is_idempotent(admin_user, overdue_installment):
      generate_notifications(on_date=date(2026, 9, 29))
      generate_notifications(on_date=date(2026, 9, 30))
      assert Notification.objects.filter(recipient=admin_user, event_key=f"installment:{overdue_installment.id}:overdue").count() == 1
  ```

- [ ] **Step 2: Run backend tests and verify failure**

  Run: `cd backend && pytest tests/test_actionable_notifications.py -q`
  Expected: FAIL because 7/3-day thresholds, stable overdue keys and read actions are absent.

- [ ] **Step 3: Implement deterministic event service and migration**

  Replace event keys containing `today` with stable object + threshold keys. Add indexed notification kind/event date only if required by the query and preserve existing rows.

- [ ] **Step 4: Write and run failing notification UI tests**

  Assert unread count, mark-one/all, exact navigation, empty and error states. Run `cd frontend && npm test -- --run tests/notification-center.test.tsx`; expect FAIL.

- [ ] **Step 5: Build attention UI and bell behavior**

  Show unread count, actionable rows, mark read, mark all, empty/error states, and dashboard `Necesita atención`; links navigate to the exact record/action.

- [ ] **Step 6: Verify and commit**

  Run: `cd backend && python manage.py makemigrations --check && pytest tests/test_actionable_notifications.py -q`; then `cd ../frontend && npm test -- --run tests/notification-center.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "feat(notifications): add actionable idempotent financial alerts"`

## Task 10: Lazy client workspace and query performance

**Files:**
- Create: `backend/apps/reporting/client_summary.py`
- Modify: `backend/apps/reporting/views.py`
- Modify: `backend/apps/reporting/urls.py`
- Create: `backend/tests/test_client_summary_performance.py`
- Create: `frontend/components/client/client-workspace.tsx`
- Create: `frontend/components/client/client-tab.tsx`
- Modify: `frontend/components/detail-pages.tsx`
- Modify: `frontend/components/module-page.tsx`
- Test: `frontend/tests/client-workspace.test.tsx`

**Interfaces:**
- Produces: `GET /api/v1/clients/{id}/summary/` with commercial metrics, next charge, next obligation, active contract and tab counts.
- Produces: each client tab owns its query and remains disabled until selected.

- [ ] **Step 1: Write failing summary/query-count tests**

  Assert summary values, related names, query ceiling, and no loading of full payment/expense/document collections. Add frontend test proving only client + summary requests run initially and one tab request runs after selection.

  ```python
  def test_client_summary_has_bounded_queries(admin_client, client, django_assert_num_queries):
      with django_assert_num_queries(12):
          response = admin_client.get(f"/api/v1/clients/{client.id}/summary/")
      assert response.status_code == 200
      assert "nextCharge" in response.json()
  ```

- [ ] **Step 2: Run backend and frontend tests and verify failure**

  Run: `cd backend && pytest tests/test_client_summary_performance.py -q`; then `cd ../frontend && npm test -- --run tests/client-workspace.test.tsx`
  Expected: FAIL because the summary endpoint and lazy workspace are absent.

- [ ] **Step 3: Implement optimized summary endpoint**

  Use aggregate/subquery/select-related operations; document the enforced query ceiling in the test instead of caching financial results.

- [ ] **Step 4: Replace eager client detail loading and default page size**

  Remove the nine-request `Promise.all`, use 20-row pages, query active tabs only, and show tab counts from summary.

- [ ] **Step 5: Verify and commit**

  Run: `cd backend && pytest tests/test_client_summary_performance.py -q`; then `cd ../frontend && npm test -- --run tests/client-workspace.test.tsx && npm run typecheck`
  Expected: PASS.
  Commit: `git add backend frontend && git commit -m "perf(clients): add summary read model and lazy tabs"`

## Task 11: Sidebar, responsive behavior and visual performance

**Files:**
- Modify: `frontend/components/app-shell.tsx`
- Modify: `frontend/components/global-glass.tsx`
- Modify: `frontend/components/ui.tsx`
- Modify: `frontend/app/globals.css`
- Create: `frontend/tests/app-shell.test.tsx`
- Create: `frontend/tests/responsive-components.test.tsx`

**Interfaces:**
- Produces: persisted `global-billing-sidebar` preference.
- Produces: collapsed navigation 80px wide with centered 40px targets, accessible tooltips and stable active indicator.
- Produces: responsive DataTable card/list mode for priority fields.

- [ ] **Step 1: Write failing shell/responsive tests**

  Assert expanded/collapsed labels, `aria-label`, persisted preference, no section headings in collapsed layout, mobile drawer close/focus behavior, reduced-motion class behavior and priority table content at mobile viewport.

  ```tsx
  fireEvent.click(screen.getByRole("button", { name: "Contraer menú" }));
  expect(screen.getByRole("navigation")).toHaveClass("collapsed");
  expect(localStorage.getItem("global-billing-sidebar")).toBe("collapsed");
  ```

- [ ] **Step 2: Run tests and verify failure**

  Run: `cd frontend && npm test -- --run tests/app-shell.test.tsx tests/responsive-components.test.tsx`
  Expected: FAIL for collapsed geometry, persisted state and responsive table behavior.

- [ ] **Step 3: Implement semantic shell states**

  Render collapsed markup intentionally rather than hiding text inside expanded geometry. Restore focus after drawer/modal close and keep 40px targets.

- [ ] **Step 4: Reduce visual rendering cost**

  Remove remaining `transition: all`, lower table/mobile blur, contain decorative layers, disable advanced refraction by default, and preserve light/dark glass fallback.

- [ ] **Step 5: Verify and commit**

  Run: `cd frontend && npm test -- --run tests/app-shell.test.tsx tests/responsive-components.test.tsx && npm run lint && npm run typecheck && npm run build`
  Expected: all commands PASS.
  Commit: `git add frontend && git commit -m "fix(ui): refine responsive navigation and rendering performance"`

## Task 12: Authenticated E2E, documentation and release verification

**Files:**
- Create: `frontend/tests/e2e/intuitive-workflows.spec.ts`
- Create: `frontend/tests/e2e/fixtures.ts`
- Modify: `frontend/playwright.config.ts`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/FINANCIAL_RULES.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/SECURITY.md`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all prior endpoints and UI flows.
- Produces: reproducible authenticated E2E fixture with fake data only; no production credentials.

- [ ] **Step 1: Add failing authenticated E2E paths**

  Cover: client → project → 11/26 contract → schedule; installment → document/message; partial payment; multi-period advance; waiver; shared expense snapshot; provision contribution/recalculation; notification deep link; collapsed sidebar; mobile payment flow.

  ```ts
  await page.getByRole("button", { name: "Crear contrato" }).click();
  await page.getByLabel("Forma de cobro").selectOption("twice_monthly");
  await expect(page.getByText("$275.000")).toHaveCount(2);
  ```

- [ ] **Step 2: Run E2E and verify fixture failure**

  Run: `cd frontend && npm run test:e2e -- intuitive-workflows.spec.ts`
  Expected: FAIL because authenticated isolated fixtures are not configured.

- [ ] **Step 3: Add isolated E2E setup**

  Create a test admin and fake domain data in a disposable test database. Never read `.env` production admin values or use real customer identification data.

- [ ] **Step 4: Update operational documentation and CI**

  Document new endpoints, UI terminology, idempotency behavior, notification schedule, migrations, rollback and VPS deployment sequence. CI must run backend tests, frontend tests/lint/typecheck/build and the viable E2E job.

- [ ] **Step 5: Run full local verification**

  Run: `cd backend && ruff check . && pytest -q`; then `cd ../frontend && npm test && npm run lint && npm run typecheck && npm run build && npm run test:e2e`
  Expected: every command exits 0.

- [ ] **Step 6: Verify Docker and migrations**

  Run: `docker compose build && docker compose run --rm backend python manage.py migrate --check && docker compose run --rm backend python manage.py check --deploy`
  Expected: images build, no unapplied migrations, and deploy check has no unacknowledged critical warning.

- [ ] **Step 7: Run production smoke checks after approved deployment**

  Verify `GET /api/health/` returns 200 with zero redirects; unauthenticated workspace redirects to `/login`; authenticated dashboard/API return 200; create/read smoke data only in a designated test tenant or remove it via supported archive/void actions.

- [ ] **Step 8: Commit and request whole-branch review**

  Run: `git add . && git commit -m "test(e2e): verify intuitive connected financial workflows"`
  Then inspect `git diff main...HEAD`, run the verification suite once more, and publish the branch for review before merging or deploying.
