/**
 * Test Script: Verify Inventory Update on Order Delivery
 * 
 * هذا السكريبت يختبر تحديث المخزون عند تسليم الطلب
 */

const DATABASE_ID = "68dbeceb003bf10d9498";
const PRODUCTS_COLLECTION_ID = "products";
const ORDERS_COLLECTION_ID = "orders";

// تكوين Appwrite
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '68dbeba80017571a1581')
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function testDeliveryInventoryUpdate() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   🧪 اختبار تحديث المخزون عند التسليم                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get a product with stock
    console.log('📦 Step 1: جلب منتج للاختبار...');
    const { documents: products } = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      [
        Query.greaterThan('units', 5),
        Query.limit(1)
      ]
    );

    if (products.length === 0) {
      console.log('❌ لا توجد منتجات متاحة للاختبار');
      return;
    }

    const product = products[0];
    const initialStock = product.units || product.stockQuantity || 0;
    
    console.log('✅ تم اختيار المنتج:');
    console.log(`   - ID: ${product.$id}`);
    console.log(`   - Name: ${product.name}`);
    console.log(`   - Initial Stock: ${initialStock} units`);

    // 2. Get a pending order with this product
    console.log('\n📋 Step 2: البحث عن طلب بحالة pending...');
    const { documents: orders } = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      [
        Query.equal('order_status', 'pending'),
        Query.limit(50)
      ]
    );

    // Find order with our product
    let testOrder = null;
    let orderItem = null;

    for (const order of orders) {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        const item = items.find(i => (i.productId || i.product_id) === product.$id);
        if (item) {
          testOrder = order;
          orderItem = item;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!testOrder) {
      console.log('⚠️  لم يتم العثور على طلب pending يحتوي على هذا المنتج');
      console.log('💡 يمكنك إنشاء طلب جديد من لوحة التحكم للاختبار');
      return;
    }

    const orderQuantity = orderItem.quantity || 1;
    console.log('✅ تم العثور على طلب:');
    console.log(`   - Order ID: ${testOrder.$id}`);
    console.log(`   - Order Code: ${testOrder.order_code || testOrder.$id.slice(-8)}`);
    console.log(`   - Status: ${testOrder.order_status}`);
    console.log(`   - Quantity: ${orderQuantity} units`);

    // 3. Calculate expected new stock
    const expectedNewStock = initialStock - orderQuantity;
    console.log(`\n📊 التوقع:`);
    console.log(`   - Stock قبل: ${initialStock}`);
    console.log(`   - الكمية المطلوبة: ${orderQuantity}`);
    console.log(`   - Stock المتوقع بعد: ${expectedNewStock}`);

    // 4. Simulate the delivery by calling the API
    console.log('\n🚀 Step 3: محاكاة تحديث الطلب إلى delivered...');
    console.log('⏳ جاري تحديث حالة الطلب...\n');

    // Call the admin orders API
    const response = await fetch(`http://localhost:3000/api/admin/orders?orderId=${testOrder.$id}&action=mark_delivered`, {
      method: 'PATCH'
    });

    const result = await response.json();

    if (!response.ok) {
      console.log('❌ فشل تحديث الطلب:');
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('✅ تم تحديث حالة الطلب بنجاح');

    // 5. Wait a moment for the update to complete
    console.log('⏳ انتظار ثانيتين لإتمام التحديث...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Check the product stock again
    console.log('\n📦 Step 4: التحقق من تحديث المخزون...');
    const updatedProduct = await databases.getDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      product.$id
    );

    const actualNewStock = updatedProduct.units || updatedProduct.stockQuantity || 0;

    console.log('📊 النتيجة:');
    console.log(`   - Stock قبل: ${initialStock}`);
    console.log(`   - Stock بعد: ${actualNewStock}`);
    console.log(`   - الفرق: ${initialStock - actualNewStock}`);
    console.log(`   - المتوقع: ${orderQuantity}`);

    // 7. Verify the result
    console.log('\n' + '═'.repeat(60));
    if (actualNewStock === expectedNewStock) {
      console.log('✅ نجح الاختبار! تم تحديث المخزون بشكل صحيح');
      console.log(`   المخزون انخفض من ${initialStock} إلى ${actualNewStock}`);
    } else if (actualNewStock === initialStock) {
      console.log('❌ فشل الاختبار! المخزون لم يتغير');
      console.log('   المشكلة: المخزون لم يتم تحديثه عند التسليم');
    } else {
      console.log('⚠️  اختبار غير متوقع!');
      console.log(`   المخزون المتوقع: ${expectedNewStock}`);
      console.log(`   المخزون الفعلي: ${actualNewStock}`);
    }
    console.log('═'.repeat(60) + '\n');

    // 8. Check inventory movements
    console.log('📝 Step 5: التحقق من سجل حركات المخزون...');
    try {
      const { documents: movements } = await databases.listDocuments(
        DATABASE_ID,
        'inventory_movements',
        [
          Query.equal('order_id', testOrder.$id),
          Query.limit(5)
        ]
      );

      if (movements.length > 0) {
        console.log(`✅ تم العثور على ${movements.length} حركة في السجل:`);
        movements.forEach((m, i) => {
          console.log(`   ${i + 1}. Type: ${m.movement_type}, Quantity: ${m.quantity}, Stock: ${m.previous_stock} → ${m.new_stock}`);
        });
      } else {
        console.log('⚠️  لم يتم العثور على حركات في السجل');
      }
    } catch (error) {
      console.log('ℹ️  لا يمكن الوصول إلى سجل inventory_movements (قد لا يكون موجوداً)');
    }

  } catch (error) {
    console.error('\n❌ حدث خطأ أثناء الاختبار:');
    console.error(error);
  }
}

// Run the test
testDeliveryInventoryUpdate().then(() => {
  console.log('\n✅ انتهى الاختبار\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ فشل الاختبار:', error);
  process.exit(1);
});