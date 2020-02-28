const imageDownloader = require('image-downloader')
const google = require('googleapis').google
const customSearch = google.customsearch('v1')

const gm = require('gm').subClass({imageMagick: true})

const path = require('path')
const rootPath = path.resolve(__dirname, '..')

const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')

const fromRoot = relPath => path.resolve(rootPath, relPath)

async function robot(){
	console.log('> [image-robot] Starting...')
	const content = state.load()

	await fetchImagesOfAllSentences(content)
    await downloadAllImages(content)
    
    await fetchAllImages(content)

	state.save(content)


	async function fetchImagesOfAllSentences(content){
		for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
			let query = `${content.sentences[sentenceIndex].keywords[0]} ${content.sentences[sentenceIndex].keywords[1]}`

			console.log(`> [image-robot] Querying Google Images with: "${query}"`)

			content.sentences[sentenceIndex].images = await fetchGoogleAndReturnImagesLink(query)
			content.sentences[sentenceIndex].googleSearchQuery = query
		}
	}

	async function fetchGoogleAndReturnImagesLink(query){
		const response = await customSearch.cse.list({
			auth: googleSearchCredentials.apiKey,
			cx: googleSearchCredentials.searchEngineId,
			q: query,
			//rights: 'cc_publicdomain',
			imgSize: 'huge',
			searchType: 'image',
			num: 5
		})

		const imageUrl = response.data.items.map((item) => {
			return item.link
		})

		return imageUrl
	}

	async function downloadAllImages(content){
		content.downloadedImages = []

		for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
			const images = content.sentences[sentenceIndex].images

			for(let imageIndex = 0; imageIndex < images.length; imageIndex++){
				const imageUrl = images[imageIndex]

				try {
					if(content.downloadedImages.includes(imageUrl)){
						throw new Error('Image already downloaded')
					}

					await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`)
					content.downloadedImages.push(imageUrl)
					console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Image successfully downloaded: ${imageUrl}`)
					break
				}catch(error){
					console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Error (${imageUrl}): ${error}`)
				}
			}
		}
	}

	async function downloadAndSave(url, fileName){
		return imageDownloader.image({
			url: url,
			dest: `./content/images/${fileName}`
		})
    }
    
    async function fetchAllImages(content) {
		for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await convertImage(sentenceIndex)
            await writeTextImage(sentenceIndex)
            await insertLogo(sentenceIndex)
		}
	}

	async function convertImage(sentenceIndex) {
		return new Promise((resolve, reject) => {
			const inputFile = fromRoot(`./content/images/${sentenceIndex}-original.png[0]`)
			const outputFile = fromRoot(`./content/images/${sentenceIndex}-converted.png`)
			const width = 940
			const height = 788

			gm()
			.in(inputFile)
			.out('(')
				.out('-clone')
				.out('0')
				.out('-background', 'white')
				.out('-blur', '0x9')
				.out('-resize', `${width}x${height}^`)
			.out(')')
			.out('(')
				.out('-clone')
				.out('0')
				.out('-background', 'white')
				.out('-resize', `${width}x${height}`)
            .out(')')
			.out('-delete', '0')
			.out('-gravity', 'center')
			.out('-compose', 'over')
			.out('-composite')
            .out('-extent', `${width}x${height}`)
            .out('-blur', '0x9')
            .out('-modulate', '45')
			.write(outputFile, (error) => {
				if (error) {
					return reject(error)
				}

				console.log(`> [video-robot] Image converted: ${outputFile}`)
				resolve()
            })
		})
    }
    
    async function writeTextImage(sentenceIndex) {
		return new Promise((resolve, reject) => {
			const inputFile = fromRoot(`./content/images/${sentenceIndex}-converted.png`)
			const outputFile = fromRoot(`./content/images/${sentenceIndex}-converted2.png`)
			const width = 940
			const height = 788

            gm(inputFile)
            .fill('#FFFFFF')
            .font('DejaVu-Sans')
            .fontSize('54')
            .out('-background', 'none')
            .out('-size', '700x', 'caption:' + content.sentences[0].text)
            .out('-gravity', 'center')
            .out('-composite')
			.write(outputFile, (error) => {
				if (error) {
					return reject(error)
				}

				console.log(`> [video-robot] Image converted: ${outputFile}`)
				resolve()
            })
		})
	}

    async function insertLogo(sentenceIndex) {
		return new Promise((resolve, reject) => {
			const inputFile = fromRoot(`./content/images/${sentenceIndex}-converted2.png`)
			const outputFile = fromRoot(`./content/images/${sentenceIndex}-final.png`)
			const width = 940
			const height = 788

            gm()
            .in('-geometry', '+0+0')
            .in(inputFile)
            .in('-page', '+20+20')
            .in('./content/images/logo.png')
            .flatten()
			.write(outputFile, (error) => {
				if (error) {
					return reject(error)
				}

				console.log(`> [video-robot] Image converted: ${outputFile}`)
				resolve()
            })
		})
	}
}

module.exports = robot
