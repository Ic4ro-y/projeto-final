#!/usr/bin/env node
import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import { fileURLToPath } from "url";

// ---------------- CONFIGURAÇÕES ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, "desafios.json");
const BACKUP_FILE = path.join(__dirname, "desafios_backup.json");

// ---------------- FUNÇÕES UTILITÁRIAS ----------------
function carregarDesafios() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (err) {
    console.warn(chalk.yellow("⚠️ Arquivo corrompido — recriando..."));
    fs.writeFileSync(DB_FILE, "[]");
    return [];
  }
}

function salvarDesafios(dados) {
  fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(dados, null, 2));
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function diasEntreDatas(data1, data2) {
  const d1 = new Date(data1);
  const d2 = new Date(data2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

async function pausar() {
  await inquirer.prompt([{ type: "input", name: "cont", message: chalk.gray("Pressione ENTER para continuar...") }]);
}

// ---------------- FUNÇÕES DE DESAFIOS ----------------
async function criarDesafio(nome, duracao, descricao) {
  const desafios = carregarDesafios();
  const ultimoId = desafios.length > 0 ? desafios[desafios.length - 1].id : 0;
  const id = ultimoId + 1;
  const inicio = hojeISO();
  const dataFim = new Date();
  dataFim.setDate(dataFim.getDate() + Number(duracao) - 1);

  const desafio = {
    id,
    nome,
    descricao,
    duracao: Number(duracao),
    dataInicio: inicio,
    dataFim: dataFim.toISOString().split("T")[0],
    status: "ativo",
    progresso: [],
    sequenciaAtual: 0,
    maiorSequencia: 0,
    estatisticas: { diasCumpridos: 0, diasFalhados: 0, porcentagemSucesso: 0 },
    conquistas: [],
  };

  desafios.push(desafio);
  salvarDesafios(desafios);
  console.log(chalk.green(`✅ Desafio criado: ${nome} (${duracao} dias)`));
}

async function registrarProgresso(id, cumprido, observacao = "") {
  const desafios = carregarDesafios();
  const desafio = desafios.find((d) => d.id === Number(id));
  if (!desafio) {
    console.log(chalk.red("❌ Desafio não encontrado!"));
    return;
  }

  const hoje = hojeISO();
  const ultimoRegistro = desafio.progresso.at(-1);

  if (ultimoRegistro && ultimoRegistro.data === hoje) {
    // Tentativa extra no mesmo dia — não aumenta streak
    desafio.progresso.push({ dia: desafio.progresso.length + 1, data: hoje, cumprido, observacao });
    console.log(chalk.yellow("📅 Tentativa adicional registrada — streak inalterada."));
  } else {
    const dia = desafio.progresso.length + 1;
    desafio.progresso.push({ dia, data: hoje, cumprido, observacao });

    if (cumprido) {
      if (!ultimoRegistro || diasEntreDatas(ultimoRegistro.data, hoje) >= 1) {
        desafio.sequenciaAtual++;
        if (desafio.sequenciaAtual > desafio.maiorSequencia) desafio.maiorSequencia = desafio.sequenciaAtual;
      }
      desafio.estatisticas.diasCumpridos++;
    } else {
      desafio.sequenciaAtual = 0;
      desafio.estatisticas.diasFalhados++;
    }

    const totalDias = desafio.estatisticas.diasCumpridos + desafio.estatisticas.diasFalhados;
    desafio.estatisticas.porcentagemSucesso =
      totalDias > 0 ? Number(((desafio.estatisticas.diasCumpridos / totalDias) * 100).toFixed(1)) : 0;

    if (desafio.estatisticas.diasCumpridos === desafio.duracao) {
      desafio.status = "concluído";
      console.log(chalk.greenBright("🎉 Parabéns! Você concluiu este desafio!"));
    }

    console.log(chalk.green("📆 Progresso registrado com sucesso!"));
  }

  salvarDesafios(desafios);
}

async function listarDesafios() {
  const dados = carregarDesafios();
  if (!dados.length) {
    console.log(chalk.yellow("📭 Nenhum desafio cadastrado."));
    return;
  }

  console.log(chalk.cyanBright("\n📋 Lista de Desafios:"));
  dados.forEach((d) =>
    console.log(
      chalk.white(`[${d.id}] `) +
        chalk.bold(d.nome) +
        ` - ${chalk.gray(d.status)} (${d.duracao} dias)` +
        chalk.green(` | ${d.estatisticas.porcentagemSucesso}% sucesso`)
    )
  );
}

async function analisarDesafio() {
  const desafios = carregarDesafios();
  if (!desafios.length) {
    console.log(chalk.yellow("📭 Nenhum desafio para analisar."));
    return;
  }

  const { id } = await inquirer.prompt([
    { type: "rawlist", name: "id", message: "Escolha um desafio:", choices: desafios.map((d) => ({ name: d.nome, value: d.id })) },
  ]);

  const desafio = desafios.find((d) => d.id === id);

  console.log(chalk.magentaBright(`\n📊 Análise do desafio: ${desafio.nome}\n`));
  console.log(`📅 Início: ${desafio.dataInicio}`);
  console.log(`🏁 Fim: ${desafio.dataFim}`);
  console.log(`🔥 Sequência atual: ${desafio.sequenciaAtual}`);
  console.log(`💪 Maior sequência: ${desafio.maiorSequencia}`);
  console.log(`✅ Dias cumpridos: ${desafio.estatisticas.diasCumpridos}`);
  console.log(`❌ Dias falhados: ${desafio.estatisticas.diasFalhados}`);
  console.log(`📈 Sucesso total: ${desafio.estatisticas.porcentagemSucesso}%`);
}

async function filtrarDesafios() {
  const desafios = carregarDesafios();
  if (!desafios.length) {
    console.log(chalk.yellow("📭 Nenhum desafio para filtrar."));
    return;
  }

  const { filtro } = await inquirer.prompt([
    {
      type: "rawlist",
      name: "filtro",
      message: "Filtrar por:",
      choices: [
        { name: "Ativos", value: "ativo" },
        { name: "Concluídos", value: "concluído" },
        { name: "Todos", value: "todos" },
      ],
    },
  ]);

  const filtrados = filtro === "todos" ? desafios : desafios.filter((d) => d.status === filtro);
  console.log(chalk.cyanBright(`\n📋 Desafios ${filtro}s:`));
  filtrados.forEach((d) => console.log(`[${d.id}] ${d.nome} - ${d.status} (${d.duracao} dias)`));
}

async function deletarDesafio() {
  const desafios = carregarDesafios();
  if (!desafios.length) {
    console.log(chalk.yellow("📭 Nenhum desafio para deletar."));
    return;
  }

  const { id } = await inquirer.prompt([
    { type: "rawlist", name: "id", message: "Selecione o desafio para excluir:", choices: desafios.map((d) => ({ name: d.nome, value: d.id })) },
  ]);

  const atualizados = desafios.filter((d) => d.id !== id);
  salvarDesafios(atualizados);
  console.log(chalk.redBright("🗑️ Desafio removido com sucesso."));
}

// ---------------- MENU PRINCIPAL ----------------
async function menu() {
  console.log(chalk.cyanBright("🏆 APP DE DESAFIOS PESSOAIS"));
  console.log(chalk.gray("====================================\n"));

  let sair = false;

  while (!sair) {
    const { opcao } = await inquirer.prompt([
      {
        type: "rawlist",
        name: "opcao",
        message: chalk.magenta("O que você deseja fazer?"),
        choices: [
          { name: "📘 Criar novo desafio", value: "criar" },
          { name: "📋 Ver todos os desafios", value: "listar" },
          { name: "🔍 Analisar desafio", value: "analisar" },
          { name: "🧭 Filtrar desafios", value: "filtrar" },
          { name: "🗓️ Registrar progresso", value: "registrar" },
          { name: "❌ Deletar desafio", value: "deletar" },
          new inquirer.Separator(),
          { name: "🚪 Sair", value: "sair" },
        ],
      },
    ]);

    switch (opcao) {
      case "criar":
        const novo = await inquirer.prompt([
          { type: "input", name: "nome", message: "Nome do desafio:" },
          { type: "number", name: "duracao", message: "Duração (dias):", default: 30 },
          { type: "input", name: "descricao", message: "Descrição:" },
        ]);
        await criarDesafio(novo.nome, novo.duracao, novo.descricao);
        await pausar();
        break;
      case "listar":
        await listarDesafios();
        await pausar();
        break;
      case "analisar":
        await analisarDesafio();
        await pausar();
        break;
      case "filtrar":
        await filtrarDesafios();
        await pausar();
        break;
      case "registrar":
        const desafios = carregarDesafios();
        if (!desafios.length) {
          console.log(chalk.yellow("📭 Nenhum desafio para registrar!"));
          await pausar();
          break;
        }
        const { id } = await inquirer.prompt([
          { type: "rawlist", name: "id", message: "Escolha o desafio:", choices: desafios.map((d) => ({ name: `${d.id} - ${d.nome}`, value: d.id })) },
        ]);
        const { cumprido, obs } = await inquirer.prompt([
          { type: "confirm", name: "cumprido", message: "Cumpriu hoje?", default: true },
          { type: "input", name: "obs", message: "Observação (opcional):" },
        ]);
        await registrarProgresso(id, cumprido, obs);
        await pausar();
        break;
      case "deletar":
        await deletarDesafio();
        await pausar();
        break;
      case "sair":
        sair = true;
        console.clear();
        console.log(chalk.greenBright("\n👋 Até mais! Continue firme nos seus desafios!\n"));
        break;
    }
  }
}

// ---------------- INÍCIO ----------------
(async () => {
  console.clear();
  console.log(chalk.cyanBright("🏆 Bem-vindo ao APP de Desafios Pessoais!\n"));
  await menu();
})();
