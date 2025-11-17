const input = document.getElementById("inputRestricao");
const btnAdicionar = document.getElementById("btnAdicionar");
const lista = document.getElementById("listaRestricoes");

let restricoes = JSON.parse(localStorage.getItem("restricoes")) || [];

function renderizarTags() {
  lista.innerHTML = "";
  restricoes.forEach((item, index) => {
    const tag = document.createElement("div");
    tag.classList.add("tag");
    tag.innerHTML = `<span>${item}</span> <button onclick="remover(${index})">×</button>`;
    lista.appendChild(tag);
  });
}

function adicionar() {
  const valor = input.value.trim();
  if (valor && !restricoes.includes(valor)) {
    restricoes.push(valor);
    localStorage.setItem("restricoes", JSON.stringify(restricoes));
    renderizarTags();
    input.value = "";
  }
}

function remover(index) {
  restricoes.splice(index, 1);
  localStorage.setItem("restricoes", JSON.stringify(restricoes));
  renderizarTags();
}

btnAdicionar.addEventListener("click", adicionar);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") adicionar();
});

renderizarTags();
