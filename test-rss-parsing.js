import Parser from 'rss-parser';

const parser = new Parser();

// Sample RSS feed data (similar to what we get from Diana Rider feed)
const sampleRSS = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0"><channel><title>Diana Rider</title><item><title>Test Video</title><description>&lt;video controls=&quot;&quot; preload=&quot;metadata&quot; poster=&quot;https://ei.phncdn.com/videos/test.jpg&quot;&gt;&lt;source src=&quot;test.webm&quot; type=&quot;video/webm&quot;&gt;&lt;/video&gt;</description><link>https://www.pornhub.com/view_video.php?viewkey=test</link></item></channel></rss>`;

async function testParsing() {
    try {
        const feed = await parser.parseString(sampleRSS);
        console.log('Feed title:', feed.title);
        console.log('\nFirst item content:');
        console.log(feed.items[0].content);
        console.log('\nFirst item description:');
        console.log(feed.items[0].description);

        // Test the regex pattern
        const content = feed.items[0].content || feed.items[0].description;
        console.log('\n--- Testing regex pattern ---');
        console.log('Content length:', content?.length);
        console.log('Content preview:', content?.substring(0, 200));

        const videoPosterMatch = content?.match(/<video[^>]+poster="([^"]+)"/);
        console.log('\nVideo poster match:', videoPosterMatch);
        console.log('Extracted poster URL:', videoPosterMatch ? videoPosterMatch[1] : null);
    } catch (error) {
        console.error('Error parsing RSS:', error);
    }
}

testParsing();
