import { fetchElsevierArticles } from "./services/elsevierService";

async function run() {
  const res = await fetchElsevierArticles("General", "original", "");
  console.log(res);
}
run();
