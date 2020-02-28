const readline = require('readline-sync')
const state = require('./state.js')

function robot(){
	const content = {
        maximumSentences: 1
    }
    
    content.searchTerm = askAndReturnSearchTerm()
    content.url = askAndReturnUrl()
    
	state.save(content)

	function askAndReturnSearchTerm(){
		return readline.question('Type a Image search term: ')
	}

    function askAndReturnUrl(){
		return readline.question('Type a Url From belasmensagens.com.br: (Digite > 0000 para Padrão): ')
	}
}

module.exports = robot