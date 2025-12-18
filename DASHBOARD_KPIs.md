# Endpoint de KPIs do Dashboard

## GET /api/dashboard/kpis

Este endpoint retorna os principais indicadores de performance (KPIs) do dashboard.

### Autenticação
Requer token JWT no header:
```
Authorization: Bearer <token>
```

### Query Parameters
- `vehicle_id` (opcional): Filtrar KPIs por veículo específico

### Resposta de Sucesso (200 OK)

```json
{
  "success": true,
  "data": {
    "total_vehicles": {
      "value": 12,
      "change_this_month": 2,
      "change_percent": 20.0
    },
    "pending_maintenances": {
      "value": 5,
      "change_this_month": -3,
      "change_percent": -37.5
    },
    "fuel_records_this_month": {
      "value": 28,
      "change_percent": 8.0,
      "total_cost": 1450.50
    },
    "avg_cost_per_km": {
      "value": 0.85,
      "avg_consumption": 12.5,
      "avg_price_per_liter": 5.89
    }
  }
}
```

## Descrição dos KPIs

### 1. Total de Veículos
Mostra o total de veículos ativos do usuário e a variação em relação ao mês anterior.

**Campos:**
- `value`: Número total de veículos ativos
- `change_this_month`: Quantos veículos foram adicionados este mês
- `change_percent`: Percentual de mudança em relação ao mês anterior

**Exemplo de card:**
```
Total de Veículos
12
+2 este mês (+20%)
```

### 2. Manutenções Pendentes
Exibe o número de manutenções/lembretes pendentes que estão próximos de vencer.

**Critérios de "pendente":**
- Status = 'pending'
- Data: próximos 30 dias, OU
- Quilometragem: faltam menos de 500km

**Campos:**
- `value`: Número de manutenções pendentes
- `change_this_month`: Diferença em relação ao mês anterior
- `change_percent`: Percentual de mudança

**Exemplo de card:**
```
Manutenções Pendentes
5
-3 vs mês anterior (-37.5%)
```

### 3. Abastecimentos (Mês Atual)
Mostra quantos abastecimentos foram realizados no mês atual e o custo total.

**Campos:**
- `value`: Número de abastecimentos este mês
- `change_percent`: Variação percentual em relação ao mês anterior
- `total_cost`: Custo total gasto com combustível este mês

**Exemplo de card:**
```
Abastecimentos (Mês)
28
+8% vs mês anterior
Total: R$ 1.450,50
```

### 4. Custo Médio/Km
Calcula o custo médio por quilômetro rodado baseado nos últimos 3 meses.

**Cálculo:**
```
custo_por_km = preço_por_litro / consumo_médio
```

**Campos:**
- `value`: Custo médio por km (R$/km)
- `avg_consumption`: Consumo médio (km/L) - calculado com tanques cheios consecutivos
- `avg_price_per_liter`: Preço médio do combustível por litro

**Observações:**
- Só calcula consumo se houver pelo menos 2 abastecimentos com tanque cheio
- `avg_consumption` e `avg_price_per_liter` podem ser `null` se não houver dados suficientes

**Exemplo de card:**
```
Custo Médio/Km
R$ 0,85
Consumo: 12.5 km/L
Preço/L: R$ 5,89
```

## Exemplos de Uso

### Obter KPIs de todos os veículos
```bash
curl -X GET "http://localhost:3000/api/dashboard/kpis" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Obter KPIs de um veículo específico
```bash
curl -X GET "http://localhost:3000/api/dashboard/kpis?vehicle_id=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Respostas de Erro

### 401 Unauthorized
```json
{
  "error": "Token não fornecido"
}
```

### 500 Internal Server Error
```json
{
  "error": "Erro interno do servidor",
  "message": "Não foi possível carregar os KPIs do dashboard"
}
```

## Notas Técnicas

### Performance
- Query otimizada com CTEs (Common Table Expressions)
- Usa agregações nativas do PostgreSQL (COUNT FILTER, COALESCE)
- Window functions (LEAD) para cálculo de consumo

### Cálculo de Consumo Médio
O consumo é calculado apenas com abastecimentos de tanque cheio consecutivos:
```sql
SELECT (km_atual - km_anterior) / litros_abastecidos as consumo
FROM fuel_records
WHERE is_full_tank = true
```

Isso garante precisão, pois só considera o ciclo completo de esvaziamento do tanque.

### Segurança
- Usuário só acessa seus próprios dados
- Validação de vehicle_id
- Proteção contra SQL injection via prepared statements

## Integração Frontend

### React/Next.js Example
```typescript
const fetchKPIs = async (vehicleId?: number) => {
  const params = new URLSearchParams();
  if (vehicleId) params.append('vehicle_id', vehicleId.toString());

  const response = await fetch(
    `/api/dashboard/kpis?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data;
};

// Uso
const kpis = await fetchKPIs();
console.log(`Total de veículos: ${kpis.total_vehicles.value}`);
console.log(`Variação: ${kpis.total_vehicles.change_percent}%`);
```

### Renderizar Cards
```tsx
<div className="kpi-card">
  <h3>Total de Veículos</h3>
  <div className="value">{kpis.total_vehicles.value}</div>
  <div className={kpis.total_vehicles.change_percent >= 0 ? 'positive' : 'negative'}>
    {kpis.total_vehicles.change_this_month > 0 ? '+' : ''}
    {kpis.total_vehicles.change_this_month} este mês
    ({kpis.total_vehicles.change_percent}%)
  </div>
</div>
```

## Relacionado

- [GET /api/dashboard/overview](README.md#dashboard-autenticados) - Visão geral completa
- [GET /api/dashboard/monthly-expenses](README.md#dashboard-autenticados) - Despesas mensais
- [GET /api/vehicles](README.md#veículos-autenticados) - Listar veículos
- [GET /api/reminders/pending](README.md#lembretes-autenticados) - Lembretes pendentes
