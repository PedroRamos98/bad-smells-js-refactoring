/*
 * src/ReportGenerator.refactored.js
 *
 * Versão refatorada do ReportGenerator, aplicando os seguintes princípios:
 * 1. Strategy Pattern (Polimorfismo): Lógicas de formatação (CSV, HTML) foram
 * movidas para classes separadas (Formatters), eliminando a duplicação
 * e os condicionais complexos.
 * 2. Extract Method: A lógica de filtragem e processamento de itens
 * foi extraída para um método privado (_processItems), limpando
 * a função principal.
 * 3. Single Responsibility Principle (SRP): O método principal agora apenas
 * coordena, os formatters formatam e o _processItems processa.
 * 4. Eliminação de Efeito Colateral: A mutação do 'item' original
 * (item.priority = true) foi removida.
 * 5. Eliminação de Magic Numbers: Constantes foram usadas para '500' e '1000'.
 */

// --- Constantes para "Magic Numbers" ---
const USER_VALUE_LIMIT = 500;
const ADMIN_PRIORITY_THRESHOLD = 1000;

// --- Interface/Base para os Formatadores (Strategy Pattern) ---
class BaseReportFormatter {
  generateHeader(user) {
    throw new Error('Method "generateHeader" must be implemented.');
  }
  generateItemRow(item, user) {
    throw new Error('Method "generateItemRow" must be implemented.');
  }
  generateFooter(total) {
    throw new Error('Method "generateFooter" must be implemented.');
  }
  
  // Método Template
  build(user, items, total) {
    let report = '';
    report += this.generateHeader(user);
    for (const item of items) {
      report += this.generateItemRow(item, user);
    }
    report += this.generateFooter(total);
    return report.trim();
  }
}

// --- Estratégia Concreta: CSV Formatter ---
class CsvReportFormatter extends BaseReportFormatter {
  generateHeader(user) {
    return 'ID,NOME,VALOR,USUARIO\n';
  }

  generateItemRow(item, user) {
    return `${item.id},${item.name},${item.value},${user.name}\n`;
  }

  generateFooter(total) {
    return `\nTotal,,\n${total},,\n`;
  }
}

// --- Estratégia Concreta: HTML Formatter ---
class HtmlReportFormatter extends BaseReportFormatter {
  generateHeader(user) {
    let header = '<html><body>\n';
    header += '<h1>Relatório</h1>\n';
    header += `<h2>Usuário: ${user.name}</h2>\n`;
    header += '<table>\n';
    header += '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n';
    return header;
  }

  generateItemRow(item, user) {
    // Lógica de prioridade está contida apenas no formatador HTML
    const style = item.priority ? 'style="font-weight:bold;"' : '';
    return `<tr ${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  }

  generateFooter(total) {
    let footer = '</table>\n';
    footer += `<h3>Total: ${total}</h3>\n`;
    footer += '</body></html>\n';
    return footer;
  }
}

// --- Classe Principal Refatorada ---
export class ReportGenerator {
  constructor(database) {
    this.db = database;
    
    // Registra as "strategies" (formatadores)
    this.formatters = {
      CSV: new CsvReportFormatter(),
      HTML: new HtmlReportFormatter(),
    };
  }

  /**
   * Processa os itens com base na regra de negócio (role).
   * Retorna uma NOVA lista de itens processados, sem mutar a original.
   */
  _processItems(user, items) {
    if (user.role === 'ADMIN') {
      // Admin vê tudo. Adiciona flag 'priority' para itens caros.
      // Retorna um novo array (map) sem mutar o original.
      return items.map((item) => ({
        ...item,
        priority: item.value > ADMIN_PRIORITY_THRESHOLD,
      }));
    }

    if (user.role === 'USER') {
      // User comum só vê itens com valor <= 500
      return items.filter((item) => item.value <= USER_VALUE_LIMIT);
    }
    
    return [];
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   */
  generateReport(reportType, user, items) {
    const formatter = this.formatters[reportType];
    if (!formatter) {
      throw new Error(`Report type "${reportType}" not supported.`);
    }

    // 1. Processar dados (filtrar e adicionar flags)
    const processedItems = this._processItems(user, items);

    // 2. Calcular o total (agora feito sobre os itens já filtrados)
    const total = processedItems.reduce((acc, item) => acc + item.value, 0);

    // 3. Construir o relatório usando a strategy
    return formatter.build(user, processedItems, total);
  }
}