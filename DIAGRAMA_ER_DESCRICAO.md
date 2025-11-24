# DIAGRAMA ENTIDADE-RELACIONAMENTO
## Sistema de Controle de Manutenção de Veículos

---

## 📋 TABELAS E RELACIONAMENTOS

### 1️⃣ USERS (Usuários)
**Campos:**
- `id` (PK) - SERIAL
- `first_name` - VARCHAR(50)
- `last_name` - VARCHAR(50)
- `username` (UNIQUE) - VARCHAR(30)
- `email` (UNIQUE) - VARCHAR(100)
- `password_hash` - VARCHAR(255)
- `role` - VARCHAR(20) [admin/user]
- `phone` - VARCHAR(20)
- `status` - VARCHAR(20) [active/inactive/suspended/deleted]
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP
- `deleted_at` - TIMESTAMP (soft delete)

**Relacionamentos:**
- 1:1 com `user_preferences`
- 1:N com `vehicles`
- 1:N com `service_providers`

---

### 2️⃣ USER_PREFERENCES (Preferências do Usuário)
**Campos:**
- `id` (PK) - SERIAL
- `user_id` (FK) - INTEGER → users.id
- `theme_mode` - VARCHAR(20) [light/dark/system]
- `theme_color` - VARCHAR(30)
- `font_size` - VARCHAR(20) [small/medium/large/extra-large]
- `compact_mode` - BOOLEAN
- `animations_enabled` - BOOLEAN
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

**Relacionamentos:**
- N:1 com `users` (CASCADE DELETE)

---

### 3️⃣ VEHICLES (Veículos)
**Campos:**
- `id` (PK) - SERIAL
- `user_id` (FK) - INTEGER → users.id
- `brand` - VARCHAR(50)
- `model` - VARCHAR(100)
- `year` - INTEGER
- `plate` (UNIQUE) - VARCHAR(20)
- `color` - VARCHAR(30)
- `current_km` - INTEGER
- `purchase_date` - DATE
- `is_active` - BOOLEAN
- `notes` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

**Relacionamentos:**
- N:1 com `users` (CASCADE DELETE)
- 1:N com `maintenances`
- 1:N com `fuel_records`
- 1:N com `reminders`

---

### 4️⃣ MAINTENANCES (Manutenções)
**Campos:**
- `id` (PK) - SERIAL
- `vehicle_id` (FK) - INTEGER → vehicles.id
- `service_provider_id` (FK, nullable) - INTEGER → service_providers.id
- `type` - VARCHAR(50) [troca_oleo/revisao/freios/etc]
- `description` - TEXT
- `cost` - DECIMAL(10,2)
- `km_at_service` - INTEGER
- `service_date` - DATE
- `next_service_km` - INTEGER
- `next_service_date` - DATE
- `invoice_number` - VARCHAR(50)
- `warranty_until` - DATE
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

**Relacionamentos:**
- N:1 com `vehicles` (CASCADE DELETE)
- N:1 com `service_providers` (SET NULL - opcional)
- 1:N com `maintenance_attachments`

---

### 5️⃣ MAINTENANCE_ATTACHMENTS (Anexos das Manutenções)
**Campos:**
- `id` (PK) - SERIAL
- `maintenance_id` (FK) - INTEGER → maintenances.id
- `file_name` - VARCHAR(255)
- `file_path` - VARCHAR(500)
- `file_type` - VARCHAR(50) [image/jpeg, application/pdf]
- `file_size` - INTEGER (bytes)
- `uploaded_at` - TIMESTAMP

**Relacionamentos:**
- N:1 com `maintenances` (CASCADE DELETE)

---

### 6️⃣ FUEL_RECORDS (Registros de Abastecimento)
**Campos:**
- `id` (PK) - SERIAL
- `vehicle_id` (FK) - INTEGER → vehicles.id
- `date` - DATE
- `km` - INTEGER
- `liters` - DECIMAL(6,2)
- `price_per_liter` - DECIMAL(6,3)
- `total_cost` - DECIMAL(10,2)
- `fuel_type` - VARCHAR(30) [gasoline/ethanol/diesel]
- `is_full_tank` - BOOLEAN
- `gas_station` - VARCHAR(100)
- `notes` - TEXT
- `created_at` - TIMESTAMP

**Relacionamentos:**
- N:1 com `vehicles` (CASCADE DELETE)

**Cálculos:**
- Consumo médio: (km_atual - km_anterior) / litros
- Custo por km: total_cost / (km_atual - km_anterior)

---

### 7️⃣ REMINDERS (Lembretes)
**Campos:**
- `id` (PK) - SERIAL
- `vehicle_id` (FK) - INTEGER → vehicles.id
- `type` - VARCHAR(50) [maintenance/insurance/license/inspection]
- `title` - VARCHAR(200)
- `description` - TEXT
- `remind_at_km` - INTEGER
- `remind_at_date` - DATE
- `is_recurring` - BOOLEAN
- `recurrence_km` - INTEGER (a cada X km)
- `recurrence_months` - INTEGER (a cada X meses)
- `status` - VARCHAR(20) [pending/notified/completed/dismissed]
- `notified_at` - TIMESTAMP
- `completed_at` - TIMESTAMP
- `created_at` - TIMESTAMP

**Relacionamentos:**
- N:1 com `vehicles` (CASCADE DELETE)

**Lógica de Alertas:**
- Se `remind_at_km` ≤ `current_km` → Notificar
- Se `remind_at_date` ≤ `today` → Notificar
- Se `is_recurring=true` → Criar novo lembrete após conclusão

---

### 8️⃣ SERVICE_PROVIDERS (Prestadores de Serviço/Oficinas)
**Campos:**
- `id` (PK) - SERIAL
- `user_id` (FK) - INTEGER → users.id
- `name` - VARCHAR(100)
- `type` - VARCHAR(50) [oficina/concessionária/lava-jato]
- `phone` - VARCHAR(20)
- `email` - VARCHAR(100)
- `address` - TEXT
- `rating` - DECIMAL(2,1) [0.0 a 5.0]
- `notes` - TEXT
- `is_favorite` - BOOLEAN
- `created_at` - TIMESTAMP

**Relacionamentos:**
- N:1 com `users` (CASCADE DELETE)
- 1:N com `maintenances`

---

### 9️⃣ MAINTENANCE_TYPES (Tipos de Manutenção - Auxiliar)
**Campos:**
- `id` (PK) - SERIAL
- `name` (UNIQUE) - VARCHAR(50) [troca_oleo/revisao/freios]
- `display_name` - VARCHAR(100) [Troca de Óleo/Revisão/Freios]
- `typical_interval_km` - INTEGER [10000/40000/etc]
- `typical_interval_months` - INTEGER [6/12/24]
- `icon` - VARCHAR(50) (nome do ícone para UI)

**Propósito:**
- Padronização de tipos de manutenção
- Sugestão automática de intervalos
- Consistência na UI

**Dados Pré-populados:**
```sql
INSERT INTO maintenance_types VALUES
('troca_oleo', 'Troca de Óleo', 10000, 6),
('revisao', 'Revisão Geral', 10000, 12),
('freios', 'Pastilhas de Freio', 40000, NULL),
('pneus', 'Rodízio de Pneus', 10000, NULL),
('alinhamento', 'Alinhamento e Balanceamento', 10000, NULL),
('filtro_ar', 'Filtro de Ar', 15000, NULL),
('bateria', 'Bateria', NULL, 24),
('velas', 'Velas de Ignição', 30000, NULL);
```

---

## 🔗 CARDINALIDADES DOS RELACIONAMENTOS

| De | Para | Cardinalidade | Tipo |
|----|------|---------------|------|
| users | user_preferences | 1:1 | Obrigatório |
| users | vehicles | 1:N | Usuário tem vários veículos |
| users | service_providers | 1:N | Usuário cadastra suas oficinas |
| vehicles | maintenances | 1:N | Veículo tem várias manutenções |
| vehicles | fuel_records | 1:N | Veículo tem vários abastecimentos |
| vehicles | reminders | 1:N | Veículo tem vários lembretes |
| maintenances | maintenance_attachments | 1:N | Manutenção tem várias fotos/docs |
| service_providers | maintenances | 1:N | Oficina atende várias manutenções |

---

## ⚙️ REGRAS DE INTEGRIDADE

### CASCADE DELETE (Exclusão em Cascata)
Quando um registro pai é excluído, todos os registros filhos são excluídos automaticamente:

1. **user** deletado → deleta:
   - `user_preferences` (1 registro)
   - `vehicles` (N registros)
   - `service_providers` (N registros)

2. **vehicle** deletado → deleta:
   - `maintenances` (N registros)
   - `fuel_records` (N registros)
   - `reminders` (N registros)

3. **maintenance** deletada → deleta:
   - `maintenance_attachments` (N registros)

### SET NULL
- `maintenances.service_provider_id` → Se oficina é deletada, campo fica NULL (manutenção mantém histórico)

### UNIQUE CONSTRAINTS
- `users.username` - Não pode ter usernames duplicados
- `users.email` - Não pode ter emails duplicados
- `vehicles.plate` - Não pode ter placas duplicadas
- `maintenance_types.name` - Nomes internos únicos

### INDEXES (para otimização de queries)
```sql
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_maintenances_vehicle_id ON maintenances(vehicle_id);
CREATE INDEX idx_maintenances_service_date ON maintenances(service_date);
CREATE INDEX idx_fuel_records_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX idx_reminders_vehicle_id ON reminders(vehicle_id);
CREATE INDEX idx_reminders_status ON reminders(status);
```

---

## 📊 EXEMPLOS DE QUERIES ÚTEIS

### 1. Total gasto por veículo
```sql
SELECT v.brand, v.model, v.plate,
       COALESCE(SUM(m.cost), 0) as total_maintenance,
       COALESCE(SUM(f.total_cost), 0) as total_fuel,
       COALESCE(SUM(m.cost), 0) + COALESCE(SUM(f.total_cost), 0) as total_spent
FROM vehicles v
LEFT JOIN maintenances m ON v.id = m.vehicle_id
LEFT JOIN fuel_records f ON v.id = f.vehicle_id
WHERE v.user_id = $1
GROUP BY v.id, v.brand, v.model, v.plate;
```

### 2. Consumo médio do veículo
```sql
SELECT AVG(
  (f.km - LAG(f.km) OVER (ORDER BY f.km)) / f.liters
) as avg_consumption_kml
FROM fuel_records f
WHERE f.vehicle_id = $1 AND f.is_full_tank = true;
```

### 3. Alertas pendentes
```sql
SELECT r.*, v.brand, v.model, v.current_km
FROM reminders r
JOIN vehicles v ON r.vehicle_id = v.id
WHERE v.user_id = $1
  AND r.status = 'pending'
  AND (
    (r.remind_at_km IS NOT NULL AND r.remind_at_km <= v.current_km)
    OR
    (r.remind_at_date IS NOT NULL AND r.remind_at_date <= CURRENT_DATE)
  )
ORDER BY r.remind_at_date ASC NULLS LAST;
```

### 4. Histórico completo do veículo
```sql
SELECT 
  'maintenance' as type,
  m.service_date as date,
  m.type as description,
  m.cost
FROM maintenances m
WHERE m.vehicle_id = $1
UNION ALL
SELECT 
  'fuel' as type,
  f.date,
  f.fuel_type as description,
  f.total_cost
FROM fuel_records f
WHERE f.vehicle_id = $1
ORDER BY date DESC;
```

---

## 📝 NOTAS IMPORTANTES

1. **Soft Delete:** Tabela `users` tem `deleted_at` para exclusão lógica
2. **Timestamps:** `created_at` e `updated_at` automáticos via trigger
3. **Validações:** 
   - `current_km` deve ser sempre crescente
   - `service_date` não pode ser futura
   - `cost` e valores monetários sempre >= 0
4. **Campos Opcionais:**
   - `service_provider_id` em maintenances (pode fazer sozinho)
   - `next_service_km` e `next_service_date` (nem sempre definidos)
5. **Cálculos Automáticos:**
   - `total_cost` em fuel_records = `price_per_liter * liters`
   - Consumo calculado no backend, não armazenado

---

## 🎯 PRÓXIMAS EXTENSÕES POSSÍVEIS

1. **Tabela de Peças:**
   - `parts` (id, maintenance_id, name, quantity, unit_price)
   - Detalhar peças trocadas em cada manutenção

2. **Histórico de Proprietários:**
   - `vehicle_owners` (id, vehicle_id, owner_name, start_date, end_date)
   - Útil para veículos usados

3. **Seguros:**
   - `insurances` (id, vehicle_id, company, policy_number, expiry_date, cost)

4. **Multas:**
   - `fines` (id, vehicle_id, date, value, description, status)

5. **Documentação:**
   - `documents` (id, vehicle_id, type, expiry_date, file_path)
   - IPVA, licenciamento, seguro obrigatório

---

**Diagrama criado em:** 22/11/2024
**Autor:** Alexander Bassani
**Projeto:** TCC - Sistema de Controle de Manutenção de Veículos
