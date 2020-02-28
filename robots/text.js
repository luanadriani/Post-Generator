const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apikey
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1')
const { IamAuthenticator } = require('ibm-watson/auth')

const rp = require('request-promise')
const $ = require('cheerio');
const padrao = 'https://www.belasmensagens.com.br/mensagens-deus'

const state = require('./state.js')

const nlu = new NaturalLanguageUnderstandingV1({
  authenticator: new IamAuthenticator({ apikey: watsonApiKey }),
  version: '2018-04-05',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
});

async function robot() {
  console.log('> Text robot starting...');

    const content = state.load()
    
	await fetchPhraseFromMensagensDeDeus(content)
	breakContentIntoSentences(content)
	limitMaximumSentences(content)
	await fetchKeywordsOfAllSentences(content)

	state.save(content)

	async function fetchPhraseFromMensagensDeDeus(content){
    console.log('> [text-robot] Fetching Phrase from Mensagem de Deus');
        const phrases = [];

        if(content.url == '0000'){
            content.url = padrao
        }

        await rp(content.url)
        .then(function(html){
            for (let i = 0; i < 24; i++) {
                phrases.push($('#grid > div > div > div > p', html)[i].children[0].data)
            }
        })
        .catch(function(err){
            //handle error
        });

        content.sourceContentOriginal = phrases[Math.round(Math.random() * (24 - 0) + 0)]

        console.log(`> [text-robot] Phrase > ${content.sourceContentOriginal}`)
        
    console.log('> [text-robot] fetching done!');
	}

	function breakContentIntoSentences(content){
		content.sentences = []

		const sentences = [content.sourceContentOriginal]
		sentences.forEach((sentence) => {
			content.sentences.push({
				text: sentence,
				keywords: [],
				images: []
			})
		})
	}

	function limitMaximumSentences(content){
		content.sentences = content.sentences.slice(0, content.maximumSentences)
	}

	async function fetchKeywordsOfAllSentences(content){
    console.log('> [text-robot] Starting to fetch keywords from Watson')
		for(const sentence of content.sentences){
      console.log(`> [text-robot] Sentence: "${sentence.text}"`)
			sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)
      console.log(`> [text-robot] Keywords: ${sentence.keywords.join(', ')}\n`)
		}
	}

  async function fetchWatsonAndReturnKeywords(sentence) {
    return new Promise((resolve, reject) => {
      nlu.analyze({
        text: sentence,
        features: {
          keywords: {}
        }
      }, (error, response) => {
        if (error) {
          reject(error)
          return
        }

        const keywords = response.result.keywords.map((keyword) => {
          return keyword.text
        })

        resolve(keywords)
      })
    })
  }
}

module.exports = robot
