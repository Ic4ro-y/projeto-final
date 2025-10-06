#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "desafios.json");
const BACKUP_FILE = path.join(__dirname, "backup_desafios.json");

// ------------------- UTILITÁRIOS -------------------
async function carregarDesafios() {
  try {
    await fs.access(DB_FILE);
    const data = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    await fs.writeFile(DB_FILE, "[]");
    return [];
  }
}

async function salvarDesafios(dados) {
  await fs.writeFile(DB_FILE, JSON.stringify(dados, null, 2));
  await fs.writeFile(BACKUP_FILE, JSON.stringify(dados, null, 2));
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

// ------------------- FUNÇÕES PRINCIPAIS -------------------
async function criarDesafio(nome, duracao, descricao) {
  const desafios = await carregarDesafios();
  const ultimoId = desafios.length ? desafios[desafios.length - 1].id : 0;
  const id = ultimoId + 1;
  const inicio = hojeISO();
  const fim = new Date();
  fim.setDate(fim.getDate() + Number(duracao) - 1);

  const desafio = {
    id,
    nome,
    descricao,
    duracao: Number(duracao),
    dataInicio: inicio,
    dataFim: fim.toISOString().split("T")[0],
    status: "ativo",
    progresso: [],
    sequenciaAtual: 0,
    maiorSequencia: 0,
    estatisticas: {
      diasCumpridos: 0,
      diasFalhados: 0,
      porcentagemSucesso: 0,
    },
  };

  desafios.push(desafio);
  await salvarDesafios(desafios);
  console.log(chalk.green(`✅ Desafio criado: ${nome} (${duracao} dias)`));
}

async function registrarProgresso(id, cumprido, observacao = "") {
  const desafios = await carregarDesafios();
  const desafio = desafios.find((d) => d.id === Number(id));
  if (!desafio) return console.log(chalk.red("❌ Desafio não encontrado!"));

  const hoje = hojeISO();
  const ultimoRegistro = desafio.progresso.find((p) => p.data === hoje);

  if (ultimoRegistro) {
    console.log(
      chalk.yellow("⚠️ Você já registrou o progresso de hoje! Tentativas extras não afetam a streak.")
    );
    return;
  }

  const dia = desafio.progresso.length + 1;

  desafio.progresso.push({
    dia,
    data: hoje,
    cumprido,
    observacao,
  });

  if (cumprido) {
    desafio.sequenciaAtual++;
    if (desafio.sequenciaAtual > desafio.maiorSequencia)
      desafio.maiorSequencia = desafio.sequenciaAtual;
    desafio.estatisticas.diasCumpridos++;
  } else {
    desafio.sequenciaAtual = 0;
    desafio.estatisticas.diasFalhados++;
  }

  const total = desafio.estatisticas.diasCumpridos + desafio.estatisticas.diasFalhados;
  desafio.estatisticas.porcentagemSucesso = total
    ? ((desafio.estatisticas.diasCumpridos / total) * 100).toFixed(1)
    : 0;

  await salvarDesafios(desafios);
  console.log(chalk.blueBright(`📅 Progresso registrado para: ${desafio.nome}`));
}

async function listarDesafios() {
  const desafios = await carregarDesafios();
  if (desafios.length === 0) {
    console.log(chalk.gray("📭 Nenhum desafio cadastrado."));
    return;
  }

  console.log(chalk.bold("\n📋 Desafios Atuais:"));
  desafios.forEach((d) => {
    const statusCor =
      d.status === "concluido"
        ? chalk.green
        : d.status === "abandonado"
        ? chalk.red
        : chalk.yellow;
    console.log(
      `${chalk.cyan(`[${d.id}]`)} ${chalk.bold(d.nome)} - ${statusCor(
        d.status
      )} | ${d.duracao} dias | Sucesso: ${d.estatisticas.porcentagemSucesso}%`
    );
  });
}

async function analisarDesafio() {
  const desafios = await carregarDesafios();
  if (desafios.length === 0) return console.log(chalk.gray("📭 Nenhum desafio disponível."));

  const { id } = await inquirer.prompt([
    {
      type: "list",
      name: "id",
      message: "Escolha um desafio para analisar:",
      choices: desafios.map((d) => ({ name: d.nome, value: d.id })),
    },
  ]);

  const desafio = desafios.find((d) => d.id === id);
  console.log(chalk.bold(`\n📊 Análise de ${desafio.nome}`));
  console.log(`Descrição: ${desafio.descricao}`);
  console.log(`Duração: ${desafio.duracao} dias`);
  console.log(`Dias cumpridos: ${desafio.estatisticas.diasCumpridos}`);
  console.log(`Dias falhados: ${desafio.estatisticas.diasFalhados}`);
  console.log(`Maior sequência: ${desafio.maiorSequencia}`);
  console.log(`Taxa de sucesso: ${desafio.estatisticas.porcentagemSucesso}%`);
}

async function filtrarPorStatus() {
  const desafios = await carregarDesafios();
  const { status } = await inquirer.prompt([
    {
      type: "list",
      name: "status",
      message: "Filtrar por status:",
      choices: ["ativo", "concluido", "abandonado"],
    },
  ]);
  const filtrados = desafios.filter((d) => d.status === status);
  listarDesafios(filtrados);
}

async function deletarDesafio() {
  const desafios = await carregarDesafios();
  if (desafios.length === 0) return console.log(chalk.gray("📭 Nenhum desafio para deletar."));

  const { id } = await inquirer.prompt([
    {
      type: "list",
      name: "id",
      message: "Selecione um desafio para deletar:",
      choices: desafios.map((d) => ({ name: d.nome, value: d.id })),
    },
  ]);

  const novos = desafios.filter((d) => d.id !== id);
  await salvarDesafios(novos);
  console.log(chalk.red("🗑️ Desafio deletado com sucesso."));
}

// ------------------- MENU -------------------
async function menu() {
  let sair = false;
  while (!sair) {
    const { opcao } = await inquirer.prompt([
      {
        type: "list",
        name: "opcao",
        message: chalk.magenta("O que você deseja fazer?"),
        choices: [
          { name: "Criar desafio", value: "criar" },
          { name: "Ver todos os desafios", value: "listar" },
          { name: "Analisar desafio", value: "analisar" },
          { name: "Registrar progresso", value: "registrar" },
          { name: "Filtrar por status", value: "filtrar" },
          { name: "Deletar desafio", value: "deletar" },
          { name: "Sair", value: "sair" },
        ],
      },
    ]);

    try {
      switch (opcao) {
        case "criar": {
          const novo = await inquirer.prompt([
            { type: "input", name: "nome", message: "Nome do desafio:" },
            {
              type: "number",
              name: "duracao",
              message: "Duração (dias):",
              default: 30,
              validate: (v) => (v > 0 ? true : "Informe um número válido."),
            },
            { type: "input", name: "descricao", message: "Descrição:" },
          ]);
          await criarDesafio(novo.nome, novo.duracao, novo.descricao);
          break;
        }

        case "listar":
          await listarDesafios();
          break;

        case "analisar":
          await analisarDesafio();
          break;

        case "registrar": {
          const desafios = await carregarDesafios();
          if (desafios.length === 0)
            return console.log(chalk.gray("📭 Nenhum desafio para registrar."));
          const { id } = await inquirer.prompt([
            {
              type: "list",
              name: "id",
              message: "Escolha o desafio:",
              choices: desafios.map((d) => ({ name: d.nome, value: d.id })),
            },
          ]);
          const { cumprido, obs } = await inquirer.prompt([
            { type: "confirm", name: "cumprido", message: "Cumpriu hoje?", default: true },
            { type: "input", name: "obs", message: "Observação (opcional):" },
          ]);
          await registrarProgresso(id, cumprido, obs);
          break;
        }

        case "filtrar":
          await filtrarPorStatus();
          break;

        case "deletar":
          await deletarDesafio();
          break;

        case "sair":
          sair = true;
          console.log(chalk.green("👋 Até mais! Continue firme nos seus desafios!"));
          break;
      }
    } catch (err) {
      console.log(chalk.red("❌ Erro no aplicativo:"), err.message);
    }
  }
}

// ------------------- INÍCIO -------------------
console.log(chalk.cyanBright("🏆 Bem-vindo ao APP de Desafios Pessoais!"));
await menu();
