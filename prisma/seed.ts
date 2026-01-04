import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dbPath = path.join(process.cwd(), "dev.db");
console.log("📁 Путь к БД:", dbPath);
const db = new Database(dbPath);

function genId(): string {
  return uuidv4().replace(/-/g, "").substring(0, 25);
}

interface ServicePointSeed {
  name: string;
  city: string;
  frontsCount: number;
  frontsOnService?: number;
  description?: string;
  notes?: string;
  addons?: number[];
}

async function main() {
  console.log("🌱 Начинаем заполнение базы данных...");

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
  console.log("📋 Таблицы в БД:", tables.map((t) => t.name).join(", "));

  // Очищаем базу
  db.exec('DELETE FROM "ServicePointAddon"');
  db.exec('DELETE FROM "ServicePointFile"');
  db.exec('DELETE FROM "ContractorFile"');
  db.exec('DELETE FROM "ContractorSuggestion"');
  db.exec('DELETE FROM "ServicePoint"');
  db.exec('DELETE FROM "Contractor"');
  db.exec('DELETE FROM "Addon"');
  db.exec('DELETE FROM "City"');
  db.exec('DELETE FROM "Agreement"');
  db.exec('DELETE FROM "User"');
  db.exec('DELETE FROM "Role"');
  console.log("✅ База очищена");

  // Создаём роли
  const rolesData = [
    { name: "Администратор", permissions: ["ADMIN"], description: "Полный доступ", isDefault: 0 },
    { name: "Менеджер", permissions: ["CREATE_CLIENT", "EDIT_OWN_CLIENT", "VIEW_ALL_CLIENTS", "SUGGEST_EDITS"], description: "Создание и редактирование своих клиентов", isDefault: 1 },
    { name: "Старший менеджер", permissions: ["CREATE_CLIENT", "EDIT_OWN_CLIENT", "EDIT_ALL_CLIENTS", "DELETE_CLIENT", "VIEW_ALL_CLIENTS"], description: "Редактирование всех клиентов", isDefault: 0 },
  ];

  for (const role of rolesData) {
    db.prepare(`
      INSERT INTO "Role" (id, name, permissions, description, isDefault, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(genId(), role.name, JSON.stringify(role.permissions), role.description, role.isDefault);
  }
  console.log("✅ Созданы роли:", rolesData.length);

  // Создаём админа
  const adminId = genId();
  const adminPassword = await bcrypt.hash("admin123", 10);
  db.prepare(`
    INSERT INTO "User" (id, login, password, name, permissions, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(adminId, "admin", adminPassword, "Администратор", JSON.stringify(["ADMIN"]));
  console.log("✅ Создан админ: admin");

  // Создаём менеджера
  const managerId = genId();
  const managerPassword = await bcrypt.hash("manager123", 10);
  db.prepare(`
    INSERT INTO "User" (id, login, password, name, permissions, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(managerId, "manager", managerPassword, "Иван Менеджеров", JSON.stringify(["CREATE_CLIENT", "EDIT_OWN_CLIENT", "VIEW_ALL_CLIENTS", "SUGGEST_EDITS"]));
  console.log("✅ Создан менеджер: manager");

  // Создаём дополнения
  const addonsData = [
    { name: "Маркировка", color: "#10B981" },
    { name: "ЕГАИС", color: "#6366F1" },
    { name: "Пиво", color: "#F59E0B" },
    { name: "Алкоголь", color: "#EF4444" },
    { name: "Плагины", color: "#8B5CF6" },
    { name: "Интеграция 1С", color: "#06B6D4" },
  ];

  const addonIds: string[] = [];
  for (const addon of addonsData) {
    const id = genId();
    addonIds.push(id);
    db.prepare(`INSERT INTO "Addon" (id, name, color, createdAt) VALUES (?, ?, ?, datetime('now'))`).run(id, addon.name, addon.color);
  }
  console.log("✅ Созданы дополнения:", addonsData.length);

  // Создаём города
  const citiesData = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Сочи", "Краснодар", "Казань"];
  const cityMap = new Map<string, string>();
  for (const city of citiesData) {
    const id = genId();
    cityMap.set(city, id);
    db.prepare(`INSERT INTO "City" (id, name, createdAt) VALUES (?, ?, datetime('now'))`).run(id, city);
  }
  console.log("✅ Созданы города:", citiesData.length);

  // Создаём типы договоров
  const agreementsData = ["Стандартный", "VIP", "Партнерский", "Тестовый", "Сезонный"];
  const agreementMap = new Map<string, string>();
  for (const agr of agreementsData) {
    const id = genId();
    agreementMap.set(agr, id);
    db.prepare(`INSERT INTO "Agreement" (id, name, createdAt) VALUES (?, ?, datetime('now'))`).run(id, agr);
  }
  console.log("✅ Созданы типы договоров:", agreementsData.length);

  // Создаём контрагентов с точками обслуживания
  const contractorsData: {
    name: string;
    inn: string;
    hasChain: number;
    status: string;
    primaryCity: string;
    agreement: string;
    generalDescription?: string;
    generalNotes?: string;
    servicePoints: ServicePointSeed[];
  }[] = [
      {
        name: "ООО Премиум Фуд",
        inn: "7701234567",
        hasChain: 1,
        status: "ACTIVE",
        primaryCity: "Москва",
        agreement: "VIP",
        generalDescription: "Крупный холдинг премиальных ресторанов",
        generalNotes: "Ключевой клиент, нужен VIP подход",
        servicePoints: [
          { name: "Ресторан Премиум Центр", city: "Москва", frontsCount: 3, frontsOnService: 3, addons: [0, 1] },
          { name: "Ресторан Премиум Сити", city: "Санкт-Петербург", frontsCount: 2, frontsOnService: 2, addons: [0, 2] },
        ]
      },
      {
        name: "ИП Иванов И.И.",
        inn: "7702345678",
        hasChain: 0,
        status: "ACTIVE",
        primaryCity: "Санкт-Петербург",
        agreement: "Стандартный",
        servicePoints: [
          { name: "Кафе У Озера", city: "Санкт-Петербург", frontsCount: 1, frontsOnService: 1, addons: [0] },
        ]
      },
      {
        name: "ООО Ночная Жизнь",
        inn: "7703456789",
        hasChain: 0,
        status: "DEBT",
        primaryCity: "Москва",
        agreement: "Стандартный",
        generalNotes: "Долг за 2 месяца!",
        servicePoints: [
          { name: "Бар Ночной", city: "Москва", frontsCount: 2, frontsOnService: 1, notes: "Нужно связаться по долгу", addons: [2, 3] },
        ]
      },
      {
        name: "ООО Быстрая Еда",
        inn: "7705678901",
        hasChain: 1,
        status: "ACTIVE",
        primaryCity: "Новосибирск",
        agreement: "Партнерский",
        generalDescription: "Сеть фастфуда по всей России",
        servicePoints: [
          { name: "Фастфуд Новосибирск 1", city: "Новосибирск", frontsCount: 2, frontsOnService: 2, addons: [0, 4] },
          { name: "Фастфуд Новосибирск 2", city: "Новосибирск", frontsCount: 2, frontsOnService: 2, addons: [0, 4] },
          { name: "Фастфуд Екатеринбург", city: "Екатеринбург", frontsCount: 1, frontsOnService: 1, addons: [0] },
        ]
      },
      {
        name: "ИП Петрова А.А.",
        inn: "7706789012",
        hasChain: 0,
        status: "SEASONAL",
        primaryCity: "Сочи",
        agreement: "Сезонный",
        servicePoints: [
          { name: "Летняя Веранда", city: "Сочи", frontsCount: 1, frontsOnService: 0, description: "Работает с мая по сентябрь" },
        ]
      },
    ];

  for (const contractor of contractorsData) {
    const contractorId = genId();
    const primaryCityId = cityMap.get(contractor.primaryCity);
    const agreementId = agreementMap.get(contractor.agreement);

    db.prepare(`
      INSERT INTO "Contractor" (id, name, inn, hasChain, status, generalDescription, generalNotes, generalIndividualTerms, createdById, managerId, primaryCityId, agreementId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      contractorId,
      contractor.name,
      contractor.inn,
      contractor.hasChain,
      contractor.status,
      contractor.generalDescription || null,
      contractor.generalNotes || null,
      null,
      adminId,
      managerId,
      primaryCityId,
      agreementId
    );

    // Создаём точки обслуживания
    for (const sp of contractor.servicePoints) {
      const spId = genId();
      const spCityId = cityMap.get(sp.city);

      db.prepare(`
        INSERT INTO "ServicePoint" (id, contractorId, name, address, cityId, frontsCount, frontsOnService, description, notes, individualTerms, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        spId,
        contractorId,
        sp.name,
        null,
        spCityId,
        sp.frontsCount,
        sp.frontsOnService || 0,
        sp.description || null,
        sp.notes || null,
        null
      );

      // Добавляем дополнения к точке
      if (sp.addons) {
        for (const addonIdx of sp.addons) {
          if (addonIds[addonIdx]) {
            db.prepare(`INSERT INTO "ServicePointAddon" (servicePointId, addonId, addedAt) VALUES (?, ?, datetime('now'))`).run(spId, addonIds[addonIdx]);
          }
        }
      }
    }
  }
  console.log("✅ Созданы контрагенты:", contractorsData.length);
  console.log("✅ Созданы точки обслуживания:", contractorsData.reduce((acc, c) => acc + c.servicePoints.length, 0));

  console.log("\n🎉 Заполнение завершено!");
  console.log("\n📝 Данные для входа:");
  console.log("   Админ: login=admin, password=admin123");
  console.log("   Менеджер: login=manager, password=manager123");

  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
