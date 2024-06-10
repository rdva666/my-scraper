const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('URL is required');
    }

    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        let sellersCount = 0;
        let hasNextPage = true;

        while (hasNextPage) {
            // Считаем продавцов на текущей странице
            const countOnPage = await page.evaluate(() => {
                const sellers = document.querySelectorAll('.sellers-table__cell a');
                return sellers.length; // Подсчитываем количество ссылок на продавцов
            });
            sellersCount += countOnPage;

            // Пытаемся перейти на следующую страницу
            hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('.pagination__el:not(._disabled):contains("Следующая")');
                if (nextButton) {
                    nextButton.click();
                    return true; // Есть следующая страница
                }
                return false; // Нет следующей страницы
            });

            // Ждем, пока страница перезагрузится после клика
            if (hasNextPage) {
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
            }
        }

        await browser.close();
        res.json({ sellersCount });
    } catch (error) {
        console.error('Error during scraping:', error);
        res.status(500).send('Error during scraping');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
