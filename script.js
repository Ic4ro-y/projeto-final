#!/usr/bin/env node
import fs from "fs";
import path from "path";
import inquirer from "inquirer";

const DB_FILE = path.join(process.cwd(), "desafios.json");

// ------------------- UTIL -------------------
function carregarDesafios() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (err) {
    console.warn("⚠️ arquivo 'desafios.json' inválido — recriando.");
    fs.writeFileSync(DB_FILE, "[]");
    return [];
  }
}

function salvarDesafios(dados) {
  fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

// ------------------- FUNÇÕES -------------------
function criarDesafio(nome, duracao, descricao) {
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
    estatisticas: {
      diasCumpridos: 0,
      diasFalhados: 0,
      porcentagemSucesso: 0
    },
    conquistas: []
  };

  desafios.push(desafio);
  salvarDesafios(desafios);
  console.log(`✅ Desafio criado (ID: ${id}): ${nome} (${duracao} dias)`);
}

function registrarProgresso(id, cumprido, observacao = "") {
    const desafios = carregarDesafios();
    const desafio = desafios.find(d => d.id === Number(id));
    if (!desafio) {
      console.log("❌ Desafio não encontrado!");
      return;
    }
  
    const hoje = hojeISO();
    // Verifica se já existe registro para hoje
    let registroHoje = desafio.progresso.find(p => p.data === hoje);
  
    if (registroHoje) {
      // Atualiza apenas observação e cumprido se quiser
      registroHoje.cumprido = cumprido;
      if (observacao) registroHoje.observacao = observacao;
      console.log(`⚠️ Já havia registro para hoje. Streak não alterada.`);
    } else {
      // Cria novo registro
      const dia = desafio.progresso.length + 1;
      desafio.progresso.push({
        dia,
        data: hoje,
        cumprido,
        observacao
      });
  
      // Atualiza streak apenas se for um novo dia
      if (cumprido) {
        desafio.sequenciaAtual++;
        if (desafio.sequenciaAtual > desafio.maiorSequencia) desafio.maiorSequencia = desafio.sequenciaAtual;
        desafio.estatisticas.diasCumpridos++;
      } else {
        desafio.sequenciaAtual = 0;
        desafio.estatisticas.diasFalhados++;
      }
    }
  
    // Atualiza estatísticas gerais
    const totalDias = desafio.estatisticas.diasCumpridos + desafio.estatisticas.diasFalhados;
    desafio.estatisticas.porcentagemSucesso = totalDias > 0
      ? Number(((desafio.estatisticas.diasCumpridos / totalDias) * 100).toFixed(1))
      : 0;
  
    salvarDesafios(desafios);
    console.log(`📅 Progresso registrado para "${desafio.nome}" em ${hoje}.`);
  }
  

function listarDesafios(dados) {
  if (dados.length === 0) {
    console.log("Nenhum desafio cadastrado.");
    return;
  }
  console.log("\n📋 Lista de Desafios:");
  dados.forEach(d => {
    console.log(`[${d.id}] ${d.nome} - ${d.status} (${d.duracao} dias)`);
  });
}

async function analisarDesafio(dados) {
  if (dados.length === 0) {
    console.log("Nenhum desafio cadastrado.");
    return;
  }

  const { id } = await inquirer.prompt([{
    type: "list",
    name: "id",
    message: "Escolha um desafio para analisar:",
    choices: dados.map(d => ({ name: `${d.nome} (${d.status})`, value: d.id }))
  }]);

  const desafio = dados.find(d => d.id === id);

  console.log(`\n📊 Análise do desafio: ${desafio.nome}`);
  console.log(`Descrição: ${desafio.descricao}`);
  console.log(`Status: ${desafio.status}`);
  console.log(`Sequência atual: ${desafio.sequenciaAtual}`);
  console.log(`Maior sequência: ${desafio.maiorSequencia}`);
  console.log(`Dias cumpridos: ${desafio.progresso.filter(p => p.cumprido).length}`);
  console.log(`Dias falhados: ${desafio.progresso.filter(p => !p.cumprido).length}`);
  console.log(`Taxa de sucesso: ${
    (desafio.progresso.filter(p => p.cumprido).length / desafio.duracao * 100).toFixed(2)
  }%`);
}

async function atualizarStatus(dados) {
  if (dados.length === 0) {
    console.log("Nenhum desafio cadastrado.");
    return;
  }

  const { id } = await inquirer.prompt([{
    type: "list",
    name: "id",
    message: "Escolha um desafio para atualizar status:",
    choices: dados.map(d => ({ name: `${d.nome} (${d.status})`, value: d.id }))
  }]);

  const { status } = await inquirer.prompt([{
    type: "list",
    name: "status",
    message: "Escolha o novo status:",
    choices: ["ativo", "concluído", "abandonado"]
  }]);

  const desafio = dados.find(d => d.id === id);
  desafio.status = status;
  salvarDesafios(dados);
  console.log(`✅ Status do desafio "${desafio.nome}" atualizado para: ${status}`);
}

async function deletarDesafio(dados) {
  if (dados.length === 0) {
    console.log("Nenhum desafio cadastrado.");
    return;
  }

  const { id } = await inquirer.prompt([{
    type: "list",
    name: "id",
    message: "Escolha um desafio para deletar:",
    choices: dados.map(d => ({ name: `${d.nome} (${d.status})`, value: d.id }))
  }]);

  const { confirmar } = await inquirer.prompt([{
    type: "confirm",
    name: "confirmar",
    message: "Tem certeza que deseja deletar?",
    default: false
  }]);

  if (!confirmar) {
    console.log("❌ Ação cancelada.");
    return;
  }

  const index = dados.findIndex(d => d.id === id);
  const nome = dados[index].nome;
  dados.splice(index, 1);
  salvarDesafios(dados);
  console.log(`✅ Desafio "${nome}" deletado.`);
}

// ------------------- MENU INTERATIVO -------------------
async function menu() {
  try {
    let sair = false;
    while (!sair) {
      const { opcao } = await inquirer.prompt([{
        type: "list",
        name: "opcao",
        message: "O que você deseja fazer?",
        choices: [
          { name: "Criar desafio", value: "criar" },
          { name: "Ver todos os desafios", value: "listar" },
          { name: "Analisar desafio", value: "analisar" },
          { name: "Registrar progresso", value: "registrar" },
          { name: "Atualizar status", value: "status" },
          { name: "Deletar desafio", value: "deletar" },
          { name: "Sair", value: "sair" }
        ]
      }]);

      const dados = carregarDesafios();

      switch (opcao) {
        case "criar": {
          const novo = await inquirer.prompt([
            { type: "input", name: "nome", message: "Nome do desafio:" },
            { type: "number", name: "duracao", message: "Duração (dias):", default: 30 },
            { type: "input", name: "descricao", message: "Descrição:" }
          ]);
          criarDesafio(novo.nome, novo.duracao, novo.descricao);
          break;
        }

        case "listar":
          listarDesafios(dados);
          break;

        case "analisar":
          await analisarDesafio(dados);
          break;

        case "registrar": {
          if (dados.length === 0) {
            console.log("📭 Nenhum desafio para registrar!");
            break;
          }
          const { id } = await inquirer.prompt([{
            type: "list",
            name: "id",
            message: "Escolha o desafio:",
            choices: dados.map(d => ({ name: `${d.id} - ${d.nome}`, value: d.id }))
          }]);
          const { cumprido, obs } = await inquirer.prompt([
            { type: "confirm", name: "cumprido", message: "Cumpriu hoje?", default: true },
            { type: "input", name: "obs", message: "Observação (opcional):" }
          ]);
          registrarProgresso(id, cumprido, obs);
          break;
        }

        case "status":
          await atualizarStatus(dados);
          break;

        case "deletar":
          await deletarDesafio(dados);
          break;

        case "sair":
          sair = true;
          console.log("👋 Até mais!");
          break;
      }
    }
  } catch (err) {
    console.error("❌ Ocorreu um erro no menu:", err.message);
  }
}

// ------------------- INÍCIO DO APP -------------------
(async () => {
  try {
    console.log("🏆 Bem-vindo ao APP de Desafios Pessoais!");
    await menu();
  } catch (err) {
    console.error("❌ Erro fatal no aplicativo:", err);
    process.exit(1);
  }
})();
